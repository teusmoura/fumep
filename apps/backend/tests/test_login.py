from uuid import uuid4

import fakeredis
import pytest

from app.login import InvalidCredentialsError, LoginService, LoginUser
from app.passwords import LoginCredentials, NewPasswordInput, hash_new_password
from app.sessions import RedisSessionStore, Role

PASSWORD = "frase longa de teste"
EMAIL = "editor@example.com"


class MemoryUsers:
    def __init__(self, user: LoginUser | None) -> None:
        self.user = user
        self.lookups: list[str] = []

    def find_by_email(self, normalized_email: str) -> LoginUser | None:
        self.lookups.append(normalized_email)
        if self.user is not None and normalized_email == self.user.email:
            return self.user
        return None


def make_user(*, role: Role = "EDITOR", active: bool = True, assigned: bool = True) -> LoginUser:
    return LoginUser(
        id=uuid4(),
        email=EMAIL,
        password_hash=hash_new_password(NewPasswordInput(password=PASSWORD)),
        role=role,
        is_active=active,
        institution_ids=(uuid4(),) if assigned else (),
    )


def setup(
    user: LoginUser | None,
) -> tuple[LoginService, MemoryUsers, RedisSessionStore, fakeredis.FakeRedis]:
    users = MemoryUsers(user)
    client = fakeredis.FakeRedis()
    store = RedisSessionStore(client, clock=lambda: 1_000_000)
    return LoginService(users, store), users, store, client


def credentials(password: str = PASSWORD) -> LoginCredentials:
    return LoginCredentials(email="  EDITOR@EXAMPLE.COM  ", password=password)


def test_editor_login_creates_scoped_opaque_redis_session() -> None:
    user = make_user()
    service, users, sessions, client = setup(user)
    result = service.login(credentials())
    data = sessions.read_and_refresh(result.session_token)
    assert data is not None
    assert data.user_id == user.id
    assert data.role == "EDITOR"
    assert data.institution_ids == list(user.institution_ids)
    assert data.csrf_token == result.csrf_token
    assert result.csrf_token not in repr(result)
    assert users.lookups == [EMAIL]
    assert client.dbsize() == 1
    assert PASSWORD not in str(client.get(f"migration:session:{result.session_token}"))


def test_admin_login_keeps_global_role_without_institution_assignment() -> None:
    user = make_user(role="ADMIN", assigned=False)
    service, _, sessions, _ = setup(user)
    data = sessions.read_and_refresh(service.login(credentials()).session_token)
    assert data is not None and data.role == "ADMIN" and data.institution_ids == []


@pytest.mark.parametrize(
    "user_kind,password",
    [
        ("missing", PASSWORD),
        ("wrong", "senha incorreta"),
        ("inactive", PASSWORD),
        ("unassigned", PASSWORD),
    ],
)
def test_failed_logins_are_uniform_and_create_no_session(user_kind: str, password: str) -> None:
    user = (
        None
        if user_kind == "missing"
        else make_user(active=user_kind != "inactive", assigned=user_kind != "unassigned")
    )
    service, users, _, client = setup(user)
    with pytest.raises(InvalidCredentialsError) as failure:
        service.login(credentials(password))
    assert str(failure.value) == "Invalid credentials"
    assert users.lookups == [EMAIL]
    assert client.dbsize() == 0


def test_repository_user_representation_does_not_expose_hash() -> None:
    user = make_user()
    assert user.password_hash not in repr(user)


def test_redis_failure_does_not_return_a_session() -> None:
    user = make_user()
    service, _, _, client = setup(user)

    def unavailable(*args: object, **kwargs: object) -> None:
        raise ConnectionError("Redis unavailable")

    client.set = unavailable  # type: ignore[method-assign]
    with pytest.raises(ConnectionError, match="Redis unavailable"):
        service.login(credentials())
    assert client.dbsize() == 0
