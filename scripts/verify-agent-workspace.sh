#!/usr/bin/env bash
set -euo pipefail

echo "Verificando estrutura base do Portal FUMEP..."

required=(
  "AGENTS.md"
  "apps"
  "packages"
  "infra"
  "docs"
  ".github"
  ".agents/skills/execute-loop/SKILL.md"
  "docs/CURRENT_LOOP.md"
  "docs/architecture/MANIFESTO_CANONICO_V1.md"
)

for item in "${required[@]}"; do
  if [[ ! -e "$item" ]]; then
    echo "FALHA: ausente: $item"
    exit 1
  fi
done

echo "OK: estrutura de agente e arquitetura presente."
