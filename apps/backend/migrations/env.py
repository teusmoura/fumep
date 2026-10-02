"""Only explicit, isolated test migration runs are enabled in MIG 5.8."""

from logging.config import fileConfig
from os import environ
from urllib.parse import urlsplit

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

url = environ.get("FUMEP_MIGRATION_DATABASE_URL")
if not url or urlsplit(url).path != "/portal_fumep_mig58_test":
    raise RuntimeError("MIG 5.8 migrations require the dedicated test database")
if urlsplit(url).hostname not in {"localhost", "127.0.0.1", "::1"}:
    raise RuntimeError("MIG 5.8 migrations require local PostgreSQL")
url = url.replace("postgresql://", "postgresql+psycopg://", 1)
config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))


def run_migrations_online() -> None:
    engine = engine_from_config(config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=None, compare_type=False)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


run_migrations_online()
