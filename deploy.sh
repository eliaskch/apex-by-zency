#!/bin/bash
set -e

# =============================================================================
# APEX by Zency — Deploy sur VPS (cohabite avec un site existant)
# Nginx est sur le host, APEX tourne dans Docker sur les ports 3001/8001
# Usage : ./deploy.sh [install|deploy|ssl|update|logs|status]
# =============================================================================

ENV_FILE=".env.prod"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file ${ENV_FILE}"

check_env() {
    if [ ! -f "${ENV_FILE}" ]; then
        echo "❌ ${ENV_FILE} introuvable. Copiez .env.prod.example → .env.prod"
        exit 1
    fi
    # Charger les variables dans le shell (pour $DOMAIN etc.)
    set -a; source "${ENV_FILE}"; set +a
}

# --- INSTALL : prérequis + config Nginx (une seule fois) ---
install() {
    check_env

    echo "🔧 Installation des prérequis..."

    # Docker
    if ! command -v docker &>/dev/null; then
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker "$USER"
        echo "⚠️  Reconnectez-vous au SSH puis relancez ./deploy.sh install"
        exit 0
    fi

    # Nginx
    if ! command -v nginx &>/dev/null; then
        sudo apt-get update && sudo apt-get install -y nginx
    fi

    # Certbot
    if ! command -v certbot &>/dev/null; then
        sudo apt-get install -y certbot python3-certbot-nginx
    fi

    # Config Nginx pour APEX
    if [ -z "$DOMAIN" ]; then
        echo "❌ Variable DOMAIN manquante dans .env.prod"
        exit 1
    fi

    echo "📝 Configuration Nginx pour ${DOMAIN}..."
    sudo cp nginx/apex.conf /etc/nginx/sites-available/apex
    # Remplacer le placeholder par le vrai domaine
    sudo sed -i "s/apex.VOTRE_DOMAINE.FR/${DOMAIN}/g" /etc/nginx/sites-available/apex

    # Activer le site
    if [ ! -L /etc/nginx/sites-enabled/apex ]; then
        sudo ln -s /etc/nginx/sites-available/apex /etc/nginx/sites-enabled/apex
    fi

    # Vérifier la config et recharger
    sudo nginx -t && sudo systemctl reload nginx

    echo "✅ Nginx configuré pour ${DOMAIN} (HTTP pour l'instant)"
    echo ""
    echo "Prochaine étape : ./deploy.sh ssl"
}

# --- SSL : certificat Let's Encrypt pour le sous-domaine ---
ssl() {
    check_env

    if [ -z "$DOMAIN" ]; then
        echo "❌ Variable DOMAIN manquante dans .env.prod"
        exit 1
    fi

    echo "🔒 Certificat SSL pour ${DOMAIN}..."
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}"

    sudo systemctl reload nginx
    echo "✅ SSL activé ! APEX accessible sur https://${DOMAIN}"
}

# --- DEPLOY : build + lancement des containers ---
deploy() {
    check_env

    echo "🚀 Build des images Docker..."
    $COMPOSE build

    echo "▶ Démarrage des containers APEX..."
    $COMPOSE up -d

    echo ""
    echo "⏳ Attente du démarrage (20s)..."
    sleep 20

    $COMPOSE ps

    # Vérifier que le backend répond
    if curl -sf http://127.0.0.1:8001/health > /dev/null; then
        echo ""
        echo "✅ APEX déployé !"
        echo "   → https://${DOMAIN:-apex.votre-domaine.fr}"
    else
        echo ""
        echo "⚠️  Le backend ne répond pas encore. Logs :"
        $COMPOSE logs --tail=30 backend
    fi
}

# --- UPDATE : code mis à jour → rebuild + restart ---
update() {
    check_env

    echo "🔄 Mise à jour APEX..."
    [ -d .git ] && git pull

    $COMPOSE build
    $COMPOSE up -d --force-recreate

    echo "✅ Mise à jour terminée"
}

# --- LOGS ---
logs() {
    $COMPOSE logs -f --tail=100 "${@:2}"
}

# --- STATUS ---
status() {
    $COMPOSE ps
}

case "${1:-help}" in
    install) install ;;
    ssl)     ssl ;;
    deploy)  deploy ;;
    update)  update ;;
    logs)    logs "$@" ;;
    status)  status ;;
    *)
        echo "APEX — Déploiement VPS"
        echo ""
        echo "  ./deploy.sh install   Config Nginx + certbot (1 seule fois)"
        echo "  ./deploy.sh ssl       Certificat Let's Encrypt"
        echo "  ./deploy.sh deploy    Build + lancer les containers"
        echo "  ./deploy.sh update    Mettre à jour (rebuild + restart)"
        echo "  ./deploy.sh logs      Voir les logs (ex: logs backend)"
        echo "  ./deploy.sh status    État des containers"
        ;;
esac
