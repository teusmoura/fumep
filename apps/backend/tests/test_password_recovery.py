import re
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.password_recovery import (
    NEUTRAL_RESPONSE,
    RESET_TOKEN_SECONDS,
    InvalidResetTokenError,
    PasswordResetService,
    RecoveryEmail,
    RecoveryRequestService,
    ResetTokenInput,
    hash_reset_token,
)
from app.passwords import LoginCredentials, NewPasswordInput, verify_password

EMAIL = "editor@example.com"
PASSWORD = "nova frase segura"
NOW = datetime(2026, 9, 28, tzinfo=timezone.utc)


@dataclass
class TokenRecord:
    user_id: UUID
    expires_at: datetime
    consumed: bool = False


class RecoveryFixture:
    """Test-only repository/dispatch with a lock modeling the executor contract."""

    def __init__(self) -> None:
        self.user_id = uuid4()
        self.user_exists = True
        self.tokens: dict[str, TokenRecord] = {}
        self.sent: list[tuple[str, str]] = []
        self.sessions = {"session-one", "session-two"}
        self.password_hash = "old-hash"
        self.audits: list[str] = []
        self.revoke_fails = False
        self.delivery_fails = False
        self.clock = NOW
        self.lock = threading.Lock()

    def find_active_user_id_by_email(self, normalized_email: str) -> UUID | None:
        return self.user_id if self.user_exists and normalized_email == EMAIL else None

    def create(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> None:
        assert user_id == self.user_id
        self.tokens[token_hash] = TokenRecord(user_id, expires_at)

    def send(self, *, email: str, raw_token: str) -> None:
        if self.delivery_fails:
            raise RuntimeError("mail unavailable")
        self.sent.append((email, raw_token))

    def revoke_all_for_user(self, user_id: UUID) -> None:
        assert user_id == self.user_id
        if self.revoke_fails:
            raise RuntimeError("Redis unavailable")
        self.sessions.clear()

    def reset(self, *, token_hash: str, password_hash: str, revoke_sessions) -> bool:
        with self.lock:
            record = self.tokens.get(token_hash)
            if (
                record is None
                or record.consumed
                or record.expires_at <= self.clock
                or not self.user_exists
            ):
                return False
            revoke_sessions(record.user_id)
            self.password_hash = password_hash
            record.consumed = True
            self.audits.append("PASSWORD_RESET")
            return True


def issue(fixture: RecoveryFixture) -> str:
    service = RecoveryRequestService(
        fixture, fixture, fixture, clock=lambda: fixture.clock
    )
    assert service.request(RecoveryEmail(email=EMAIL)) == NEUTRAL_RESPONSE
    return fixture.sent[-1][1]


def reset_service(fixture: RecoveryFixture) -> PasswordResetService:
    return PasswordResetService(fixture, fixture)


def test_request_is_neutral_and_persists_only_hash_for_active_account() -> None:
    fixture = RecoveryFixture()
    service = RecoveryRequestService(
        fixture, fixture, fixture, clock=lambda: fixture.clock
    )
    assert service.request(RecoveryEmail(email="  EDITOR@EXAMPLE.COM ")) == NEUTRAL_RESPONSE
    raw = fixture.sent[0][1]
    assert re.fullmatch(r"[A-Za-z0-9_-]{43}", raw)
    assert raw not in repr(fixture.tokens)
    record = fixture.tokens[hash_reset_token(raw)]
    assert record.expires_at == NOW + timedelta(seconds=RESET_TOKEN_SECONDS)
    assert service.request(RecoveryEmail(email="missing@example.com")) == NEUTRAL_RESPONSE
    assert len(fixture.sent) == len(fixture.tokens) == 1
    fixture.user_exists = False
    assert service.request(RecoveryEmail(email=EMAIL)) == NEUTRAL_RESPONSE
    assert len(fixture.sent) == 1


def test_delivery_failure_still_returns_neutral_response() -> None:
    fixture = RecoveryFixture()
    fixture.delivery_fails = True
    service = RecoveryRequestService(fixture, fixture, fixture, clock=lambda: NOW)
    assert service.request(RecoveryEmail(email=EMAIL)) == NEUTRAL_RESPONSE


def test_tokens_are_random_and_hashes_distinct() -> None:
    fixture = RecoveryFixture()
    first, second = issue(fixture), issue(fixture)
    assert first != second
    assert hash_reset_token(first) != hash_reset_token(second)
    assert len(fixture.tokens) == 2


def test_reset_updates_hash_consumes_token_audits_and_revokes_sessions() -> None:
    fixture = RecoveryFixture()
    raw = issue(fixture)
    reset_service(fixture).reset(
        ResetTokenInput(token=raw), NewPasswordInput(password=PASSWORD)
    )
    assert fixture.sessions == set()
    assert fixture.tokens[hash_reset_token(raw)].consumed
    assert fixture.audits == ["PASSWORD_RESET"]
    assert fixture.password_hash != PASSWORD
    assert verify_password(LoginCredentials(email=EMAIL, password=PASSWORD), fixture.password_hash)
    with pytest.raises(InvalidResetTokenError):
        reset_service(fixture).reset(
            ResetTokenInput(token=raw), NewPasswordInput(password=PASSWORD)
        )


def test_unknown_expired_and_disabled_tokens_do_not_change_password() -> None:
    fixture = RecoveryFixture()
    raw = issue(fixture)
    service = reset_service(fixture)
    for token, advance, active in [
        ("A" * 43, False, True),
        (raw, True, True),
        (raw, False, False),
    ]:
        fixture.clock = NOW + timedelta(seconds=RESET_TOKEN_SECONDS) if advance else NOW
        fixture.user_exists = active
        with pytest.raises(InvalidResetTokenError):
            service.reset(ResetTokenInput(token=token), NewPasswordInput(password=PASSWORD))
        assert fixture.password_hash == "old-hash"
        assert fixture.audits == []
        assert fixture.sessions == {"session-one", "session-two"}


def test_revocation_failure_leaves_token_and_password_unchanged_for_retry() -> None:
    fixture = RecoveryFixture()
    raw = issue(fixture)
    fixture.revoke_fails = True
    with pytest.raises(RuntimeError, match="Redis unavailable"):
        reset_service(fixture).reset(
            ResetTokenInput(token=raw), NewPasswordInput(password=PASSWORD)
        )
    assert fixture.password_hash == "old-hash"
    assert not fixture.tokens[hash_reset_token(raw)].consumed
    assert fixture.audits == []
    fixture.revoke_fails = False
    reset_service(fixture).reset(ResetTokenInput(token=raw), NewPasswordInput(password=PASSWORD))
    assert fixture.tokens[hash_reset_token(raw)].consumed


def test_concurrent_reset_has_single_winner() -> None:
    fixture = RecoveryFixture()
    raw = issue(fixture)
    service = reset_service(fixture)

    def attempt(_: int) -> bool:
        try:
            service.reset(ResetTokenInput(token=raw), NewPasswordInput(password=PASSWORD))
            return True
        except InvalidResetTokenError:
            return False

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attempt, range(2))) == [False, True]
    assert fixture.audits == ["PASSWORD_RESET"]


def test_token_validation_does_not_echo_secret() -> None:
    with pytest.raises(ValidationError) as failure:
        ResetTokenInput.model_validate({"token": "visible-invalid-token"})
    assert "visible-invalid-token" not in str(failure.value)
    assert "visible-invalid-token" not in repr(failure.value.errors())
    with pytest.raises(ValidationError):
        NewPasswordInput(password="too short")
