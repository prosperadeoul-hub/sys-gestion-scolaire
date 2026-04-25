from rest_framework import serializers
from .models import Etudiant, Note, Matiere, Examen, Professeur, User, Promotion

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
    matieres_count = serializers.SerializerMethodField()

    class Meta:
        model = Professeur
        fields = ['id', 'user', 'specialite', 'matieres_count']

    def get_matieres_count(self, obj):
        return obj.matieres.count()

class EtudiantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    promotion_nom = serializers.ReadOnlyField(source='promotion.nom')

    class Meta:
        model = Etudiant
        fields = ['id', 'user', 'promotion', 'promotion_nom', 'matricule', 'frais_scolarite_total', 'frais_payes']