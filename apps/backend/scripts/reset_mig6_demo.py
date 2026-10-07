"""Interactive password reset for a local MIG 6 demo ADMIN, never production recovery."""

import hmac
import os
from getpass import getpass
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import EmailStr, TypeAdapter, ValidationError
from redis import Redis
from sqlalchemy import text
from sqlalchemy.engine import URL

from app.database import database_engine
from app.passwords import NewPasswordInput, hash_new_password
from app.sessions import SessionData

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def require_local_demo_targets(database_url: URL, redis_url: str) -> None:
    redis_target = urlsplit(redis_url)
    if database_url.database != "portal_fumep_mig58_test" or database_url.host not in LOCAL_HOSTS:
        raise SystemExit("Use only the local portal_fumep_mig58_test database")
    if redis_target.scheme not in {"redis", "rediss"} or redis_target.hostname not in LOCAL_HOSTS:
        raise SystemExit("Use only a local Redis for MIG 6 demo sessions")


def revoke_demo_sessions(client: Redis, user_id: UUID) -> int:
    """Remove only this user's migration-prefixed sessions; never flush Redis."""
    keys: list[bytes] = []
    for key in client.scan_iter(match="migration:session:*"):
        raw = client.get(key)
        if raw is None:
            continue
        try:
            session = SessionData.model_validate_json(raw)
        except ValidationError:
            continue  # Unreadable sessions are already rejected by RedisSessionStore.
        if session.user_id == user_id:
            keys.append(key)
    if keys:
        client.delete(*keys)
    return len(keys)


def main() -> None:
    engine = database_engine()
    redis_url = os.environ.get("REDIS_URL", "")
    require_local_demo_targets(engine.url, redis_url)
    client = Redis.from_url(redis_url)
    try:
        email = str(TypeAdapter(EmailStr).validate_python(input("E-mail do ADMIN a redefinir: ").strip().lower()))
        with engine.connect() as db:
            account = db.execute(text(
                "SELECT id FROM users WHERE lower(email) = :email AND role = 'ADMIN' AND is_active = true"
            ), {"email": email}).first()
        if account is None:
            raise SystemExit("ADMIN ativo não encontrado no banco local de demonstração")
        if input("Digite REDEFINIR para confirmar: ").strip() != "REDEFINIR":
            raise SystemExit("Redefinição cancelada")
        first = getpass("Nova senha (mínimo 10 caracteres): ")
        second = getpass("Repita a nova senha: ")
        if not hmac.compare_digest(first, second):
            raise SystemExit("As senhas não coincidem; nenhuma alteração foi feita")
        password_hash = hash_new_password(NewPasswordInput(password=first))
        with engine.begin() as db:
            locked = db.execute(text(
                "SELECT id FROM users WHERE id = :id AND role = 'ADMIN' AND is_active = true FOR UPDATE"
            ), {"id": account.id}).first()
            if locked is None:
                raise SystemExit("ADMIN não está mais ativo; nenhuma alteração foi feita")
            client.ping()
            revoked = revoke_demo_sessions(client, account.id)
            db.execute(text("UPDATE users SET password_hash = :hash WHERE id = :id"),
                       {"hash": password_hash, "id": account.id})
        print(f"Senha redefinida no banco local. Sessões anteriores removidas: {revoked}.")
    finally:
        client.close()
        engine.dispose()


if __name__ == "__main__":
    main()
