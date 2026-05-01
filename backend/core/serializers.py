from rest_framework import serializers
from .models import Etudiant, Note, Matiere, Examen, Professeur, User, Promotion, Salle, Cours
from datetime import datetime, date, time, timedelta

class MatiereSerializer(serializers.ModelSerializer):
    professeur_name = serializers.ReadOnlyField(source='professeur.user.profile.full_name')

    class Meta:
        model = Matiere
        fields = ['id', 'nom', 'code', 'coefficient', 'categorie', 'professeur_name']

class ExamenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Examen
        fields = ['id', 'nom', 'date_examen', 'matiere']

class StudentGradeSerializer(serializers.Serializer):
    """Utilisé pour la liste de saisie des profs"""
    etudiant_id = serializers.IntegerField()
    nom = serializers.CharField(source='user.profile.full_name', read_only=True)
    matricule = serializers.CharField(read_only=True)
    note_id = serializers.IntegerField(allow_null=True, read_only=True)
    valeur = serializers.FloatField(required=False)
    commentaire = serializers.CharField(required=False, allow_blank=True)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']

class PromotionSerializer(serializers.ModelSerializer):
    etudiants_count = serializers.SerializerMethodField()
    matieres_count = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = ['id', 'nom', 'annee', 'etudiants_count', 'matieres_count']

    def get_etudiants_count(self, obj):
        return obj.etudiants.count()

    def get_matieres_count(self, obj):
        return obj.matieres_programme.count()

class ProfesseurSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.ReadOnlyField(source='user.get_full_name')
    matieres_count = serializers.SerializerMethodField()

    class Meta:
        model = Professeur
        fields = ['id', 'user', 'full_name', 'specialite', 'matieres_count']

    def get_matieres_count(self, obj):
        return obj.matieres.count()

class EtudiantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    promotion_nom = serializers.ReadOnlyField(source='promotion.nom')

    class Meta:
        model = Etudiant
        fields = ['id', 'user', 'promotion', 'promotion_nom', 'matricule', 'frais_scolarite_total', 'frais_payes']


# Serializers pour Salle et Cours
class SalleSerializer(serializers.ModelSerializer):
    disponibilite = serializers.SerializerMethodField()

    class Meta:
        model = Salle
        fields = ['id', 'nom', 'capacite', 'equipement', 'statut', 'created_at', 'disponibilite']

    def get_disponibilite(self, obj):
        """Retourne True si la salle est disponible actuellement (pas de cours en cours)"""
        now = date.today()
        current_time = datetime.now().time()
        # Vérifier s'il y a un cours en cours maintenant
        return not obj.cours_plannifies.filter(
            date=now,
            heure_debut__lte=current_time,
            heure_fin__gte=current_time
        ).exists()


class CoursSerializer(serializers.ModelSerializer):
    matiere_nom = serializers.ReadOnlyField(source='matiere.nom')
    matiere_code = serializers.ReadOnlyField(source='matiere.code')
    matiere_categorie = serializers.ReadOnlyField(source='matiere.categorie')
    enseignant_nom = serializers.ReadOnlyField(source='enseignant.user.get_full_name')
    promotion_nom = serializers.ReadOnlyField(source='promotion.nom')
    salle_nom = serializers.ReadOnlyField(source='salle.nom')

    class Meta:
        model = Cours
        fields = [
            'id', 'matiere', 'matiere_nom', 'matiere_code', 'matiere_categorie',
            'enseignant', 'enseignant_nom',
            'promotion', 'promotion_nom',
            'salle', 'salle_nom',
            'date', 'heure_debut', 'heure_fin', 'notes', 'created_at'
        ]
        extra_kwargs = {
            'date': {'required': True},
            'heure_debut': {'required': True},
            'heure_fin': {'required': True},
        }

    def validate(self, data):
        """Valide les contraintes de conflits"""
        # Vérifier que l'heure de fin est après l'heure de début
        if data['heure_debut'] >= data['heure_fin']:
            raise serializers.ValidationError("L'heure de fin doit être après l'heure de début")

        # Vérifier conflit salle
        conflit_salle = Cours.objects.filter(
            salle=data['salle'],
            date=data['date'],
            heure_debut__lt=data['heure_fin'],
            heure_fin__gt=data['heure_debut']
        )
        if self.instance:
            conflit_salle = conflit_salle.exclude(id=self.instance.id)
        if conflit_salle.exists():
            salle_conflit = conflit_salle.first()
            raise serializers.ValidationError(
                f"Conflit : La salle {data['salle'].nom} est déjà occupée le {data['date']} de {salle_conflit.heure_debut} à {salle_conflit.heure_fin}"
            )

        # Vérifier conflit enseignant
        conflit_prof = Cours.objects.filter(
            enseignant=data['enseignant'],
            date=data['date'],
            heure_debut__lt=data['heure_fin'],
            heure_fin__gt=data['heure_debut']
        )
        if self.instance:
            conflit_prof = conflit_prof.exclude(id=self.instance.id)
        if conflit_prof.exists():
            prof_conflit = conflit_prof.first()
            raise serializers.ValidationError(
                f"Conflit : L'enseignant {data['enseignant'].user.get_full_name()} a déjà un cours le {data['date']} de {prof_conflit.heure_debut} à {prof_conflit.heure_fin}"
            )

        return data
