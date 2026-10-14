#!/usr/bin/env bash
# Despliegue de admin.erpespuma.cl en el VPS.
#
#   bash deploy/deploy.sh install            Primera instalación
#   bash deploy/deploy.sh update             Subir cambios nuevos (hace un respaldo antes)
#   bash deploy/deploy.sh backup             Respaldo de la base de datos
#   bash deploy/deploy.sh restore ARCHIVO    Restaurar un respaldo (.dump)
#
# Opcional: CERTBOT_EMAIL=correo@dominio.cl bash deploy/deploy.sh install

set -Eeuo pipefail

DOMINIO="admin.erpespuma.cl"
PUERTO_WEB="4200"

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="$(dirname "$APP")"
RESPALDOS="$BASE/backups-admin-erpespuma"
SITIO_DISPONIBLE="/etc/nginx/sites-available/$DOMINIO"
SITIO_ACTIVO="/etc/nginx/sites-enabled/$DOMINIO"

paso()   { echo; echo "==> $*"; }
fallar() { echo "ERROR: $*" >&2; exit 1; }

dc() { (cd "$APP" && docker compose -f docker-compose.prod.yml "$@"); }

requisitos() {
  [ "$(id -u)" -eq 0 ] || fallar "Ejecuta este script como root."
  for cmd in docker git nginx certbot openssl curl nslookup ss; do
    command -v "$cmd" >/dev/null 2>&1 || fallar "Falta el programa: $cmd"
  done
  [ -f "$APP/docker-compose.prod.yml" ] || fallar "No encuentro docker-compose.prod.yml en $APP"
}

crear_env() {
  if [ -f "$APP/.env" ]; then
    echo "Ya existe $APP/.env, no se modifica."
    return
  fi
  paso "Creando .env con claves aleatorias..."
  cat > "$APP/.env" <<EOF
DB_USER=fabrica_user
DB_PASSWORD=$(openssl rand -hex 24)
DB_NAME=fabrica_espuma
JWT_SECRET=$(openssl rand -hex 48)
CORS_ORIGINS=https://$DOMINIO
WEB_PORT=$PUERTO_WEB
EOF
  chmod 600 "$APP/.env"
}

verificar_puerto() {
  if ss -ltnH "sport = :$PUERTO_WEB" | grep -q .; then
    if [ -z "$(dc ps -q frontend 2>/dev/null)" ]; then
      fallar "El puerto $PUERTO_WEB ya lo usa otro programa. Cambia PUERTO_WEB en este script y WEB_PORT en .env."
    fi
  fi
}

verificar_dns() {
  paso "Comprobando el DNS de $DOMINIO..."
  ip_vps=$(curl -4 -s ifconfig.me)
  ip_dns=$(nslookup "$DOMINIO" 8.8.8.8 | awk '/^Address/ && $2 ~ /^[0-9.]+$/ {print $2}' | tail -1)
  echo "IP del VPS: $ip_vps | IP del dominio: ${ip_dns:-ninguna}"
  if [ -z "$ip_dns" ] || [ "$ip_dns" != "$ip_vps" ]; then
    fallar "El dominio no apunta a este VPS todavía. Revisa el registro A y vuelve a intentar."
  fi
}

construir() {
  paso "Construyendo el backend..."
  dc build backend
  paso "Construyendo el frontend..."
  dc build frontend
  paso "Levantando los contenedores..."
  dc up -d
}

esperar_backend() {
  paso "Esperando a que el sistema responda..."
  for _ in $(seq 1 40); do
    codigo=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
      -H 'Content-Type: application/json' -d '{}' \
      "http://127.0.0.1:$PUERTO_WEB/api/auth/login" || true)
    if [ "$codigo" = "400" ] || [ "$codigo" = "401" ]; then
      echo "Listo (respuesta $codigo)."
      return 0
    fi
    sleep 3
  done
  dc logs --tail 40 backend
  fallar "El backend no respondió a tiempo. Revisa los logs de arriba."
}

configurar_nginx() {
  if [ -f "$SITIO_DISPONIBLE" ]; then
    echo "El sitio de Nginx ya existe, no se modifica."
    return
  fi
  paso "Creando el sitio de Nginx..."
  sed -e "s/__DOMINIO__/$DOMINIO/g" -e "s/__PUERTO__/$PUERTO_WEB/g" > "$SITIO_DISPONIBLE" <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name __DOMINIO__;

    client_max_body_size 25m;

    access_log /var/log/nginx/__DOMINIO__.access.log;
    error_log  /var/log/nginx/__DOMINIO__.error.log;

    location / {
        proxy_pass http://127.0.0.1:__PUERTO__;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
EOF
  ln -sf "$SITIO_DISPONIBLE" "$SITIO_ACTIVO"
  if ! nginx -t; then
    rm -f "$SITIO_ACTIVO" "$SITIO_DISPONIBLE"
    fallar "La configuración de Nginx no es válida. Se quitó este sitio y no se recargó nada."
  fi
  systemctl reload nginx
}

emitir_certificado() {
  if [ -d "/etc/letsencrypt/live/$DOMINIO" ]; then
    echo "Ya existe el certificado de $DOMINIO."
    return
  fi
  paso "Pidiendo el certificado HTTPS..."
  if [ -n "${CERTBOT_EMAIL:-}" ]; then
    correo=(-m "$CERTBOT_EMAIL")
  else
    correo=(--register-unsafely-without-email)
  fi
  certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos --redirect "${correo[@]}"
}

instalar_respaldo_diario() {
  paso "Programando el respaldo diario (03:30)..."
  cat > /etc/cron.d/admin-erpespuma <<EOF
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * root bash $APP/deploy/deploy.sh backup >> /var/log/admin-erpespuma-backup.log 2>&1
EOF
  chmod 644 /etc/cron.d/admin-erpespuma
}

respaldar() {
  local archivo
  mkdir -p "$RESPALDOS"
  chmod 700 "$RESPALDOS"
  archivo="$RESPALDOS/respaldo-$(date +%Y-%m-%d_%H%M%S).dump"
  paso "Respaldando la base de datos en $archivo"
  if ! dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c' > "$archivo"; then
    rm -f "$archivo"
    fallar "No se pudo crear el respaldo."
  fi
  if [ ! -s "$archivo" ]; then
    rm -f "$archivo"
    fallar "El respaldo salió vacío."
  fi
  chmod 600 "$archivo"
  find "$RESPALDOS" -name 'respaldo-*.dump' -mtime +14 -delete
  echo "Respaldo listo ($(du -h "$archivo" | cut -f1)). Se conservan los últimos 14 días."
}

restaurar() {
  local archivo respuesta
  archivo="${1:-}"
  if [ -z "$archivo" ] || [ ! -f "$archivo" ]; then
    fallar "Indica el archivo: bash deploy/deploy.sh restore /ruta/respaldo.dump"
  fi
  echo "Esto REEMPLAZA todos los datos actuales del sistema por los del archivo."
  read -r -p "Escribe SI para continuar: " respuesta
  [ "$respuesta" = "SI" ] || fallar "Cancelado."
  respaldar
  paso "Deteniendo el backend..."
  dc stop backend
  paso "Restaurando los datos..."
  if ! dc exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl' < "$archivo"; then
    echo "AVISO: pg_restore terminó con avisos. Revisa los mensajes de arriba."
  fi
  paso "Iniciando el backend..."
  dc start backend
  esperar_backend
}

instalar() {
  requisitos
  crear_env
  verificar_puerto
  verificar_dns
  construir
  esperar_backend
  configurar_nginx
  emitir_certificado
  instalar_respaldo_diario
  paso "Instalación terminada: https://$DOMINIO"
  echo "Siguiente paso, para cargar tus datos:"
  echo "  bash $APP/deploy/deploy.sh restore /ruta/al/respaldo.dump"
}

actualizar() {
  requisitos
  paso "Descargando los cambios de GitHub..."
  git -C "$APP" pull --ff-only
  respaldar
  construir
  esperar_backend
  paso "Actualización lista."
}

case "${1:-}" in
  install) instalar ;;
  update)  actualizar ;;
  backup)  requisitos; respaldar ;;
  restore) requisitos; restaurar "${2:-}" ;;
  *)
    echo "Uso: bash deploy/deploy.sh {install|update|backup|restore ARCHIVO}"
    exit 1
    ;;
esac