"""
Système de spécialités extensible — AUCUNE logique dentaire hardcodée ailleurs.
Ajouter une spécialité = ajouter une entrée ici. Aucun autre fichier à modifier.
"""

SPECIALTIES: dict[str, dict] = {
    "dentaire": {
        "label": "Chirurgie dentaire",
        "active": True,
        "acts": {
            "bilan": "Bilan / Examen clinique",
            "carie": "Soin carie / Obturation",
            "endodontie": "Traitement endodontique",
            "extraction": "Extraction dentaire",
            "detartrage": "Détartrage / Prophylaxie",
            "prothese": "Prothèse fixe (couronne / bridge)",
            "urgence": "Urgence dentaire",
        },
    },
    "generaliste": {
        "label": "Médecine générale",
        "active": False,  # V2
        "acts": {
            "consultation": "Consultation générale",
            "suivi": "Suivi pathologie chronique",
            "urgence": "Consultation urgente",
            "preventif": "Bilan de santé / Prévention",
        },
    },
    "kine": {
        "label": "Kinésithérapie",
        "active": False,  # V3
        "acts": {
            "bilan_entree": "Bilan d'entrée",
            "seance": "Compte rendu de séance",
            "bilan_sortie": "Bilan de fin de traitement",
        },
    },
}


def get_active_specialties() -> dict[str, dict]:
    return {k: v for k, v in SPECIALTIES.items() if v.get("active")}


def get_specialty_acts(specialty: str) -> dict[str, str]:
    if specialty not in SPECIALTIES:
        raise ValueError(f"Spécialité inconnue : {specialty}")
    return SPECIALTIES[specialty]["acts"]


def is_valid_act(specialty: str, act_type: str) -> bool:
    if specialty not in SPECIALTIES:
        return False
    return act_type in SPECIALTIES[specialty]["acts"]
