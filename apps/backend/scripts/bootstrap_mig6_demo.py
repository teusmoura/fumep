"""Interactive, local-only bootstrap for the dedicated MIG 6 demonstration database."""

from getpass import getpass

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import text

from app.database import database_engine
from app.passwords import NewPasswordInput, hash_new_password


def main() -> None:
    engine = database_engine()
    if engine.url.database != "portal_fumep_mig58_test" or engine.url.host not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit("Use only the local portal_fumep_mig58_test database")
    email = str(TypeAdapter(EmailStr).validate_python(input("E-mail do ADMIN de demonstração: ").strip().lower()))
    with engine.begin() as db:
        existing = db.execute(text("SELECT role FROM users WHERE email = :email"), {"email": email}).first()
    if existing is not None:
        raise SystemExit("Este e-mail já existe; nenhuma credencial foi modificada")
    password = NewPasswordInput(password=getpass("Senha nova (mínimo 10 caracteres): "))
    password_hash = hash_new_password(password)
    with engine.begin() as db:
        for name, slug in (("FUMEP", "fumep"), ("ETMSL", "etmsl"), ("CRAMAM", "cramam")):
            db.execute(text(
                "INSERT INTO institutions (name, slug) VALUES (:name, :slug) ON CONFLICT (slug) DO NOTHING"
            ), {"name": name, "slug": slug})
        db.execute(text(
            "INSERT INTO users (name, email, password_hash, role) "
            "VALUES ('Administrador de demonstração', :email, :password_hash, 'ADMIN')"
        ), {"email": email, "password_hash": password_hash})
    print("ADMIN e instituições locais prontos. Senha não foi gravada em arquivo.")


if __name__ == "__main__":
    main()
