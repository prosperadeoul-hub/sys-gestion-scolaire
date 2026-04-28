import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

# 1. Utilisateur personnalisé
class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrateur'),
        ('ENSEIGNANT', 'Enseignant'),
        ('ETUDIANT', 'Étudiant'),
    )
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='ETUDIANT')
    # Réduit à 150 pour éviter l'erreur d'index sur MySQL
    email = models.EmailField(unique=True, max_length=150) 

    def __str__(self):
        return f"{self.username} ({self.role})"

# 2. Promotions
class Promotion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=100)
    annee = models.IntegerField()

    def __str__(self):
        return f"{self.nom} - {self.annee}"

# 3. Professeurs
class Professeur(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='professeur_profile')
    specialite = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Prof. {self.user.last_name}"

# 4. Étudiants
class Etudiant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='etudiant_profile')
    promotion = models.ForeignKey(Promotion, on_delete=models.SET_NULL, null=True, related_name='etudiants')
    # Matricule réduit à 50 pour l'index unique
    matricule = models.CharField(max_length=50, unique=True) 
    frais_scolarite_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    frais_payes = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f"{self.user.last_name} ({self.matricule})"

# 5. Matières
class Matiere(models.Model):
    CAT_CHOICES = (
        ('TECH', 'Technique'),
        ('SOFT', 'Soft Skills'),
        ('LANG', 'Langues'),
        ('SCIE', 'Sciences'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=150)
    # Code réduit à 30 pour l'index unique
    code = models.CharField(max_length=30, unique=True) 
    coefficient = models.IntegerField(default=1)
    categorie = models.CharField(max_length=10, choices=CAT_CHOICES, default='TECH')
    professeur = models.ForeignKey(Professeur, on_delete=models.SET_NULL, null=True, related_name='matieres')
    promotions = models.ManyToManyField(Promotion, related_name='matieres_programme')

    def __str__(self):
        return f"[{self.code}] {self.nom}"

# 6. Examens
class Examen(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=150)
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='examens')
    date_examen = models.DateField()

    def __str__(self):
        return self.nom

# 7. Notes
class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notes')
    examen = models.ForeignKey(Examen, on_delete=models.CASCADE, related_name='notes')
    valeur = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('20.00'))]
    )
    commentaire = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('etudiant', 'examen')


# 8. Salles
class Salle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=50, unique=True)
    capacite = models.IntegerField(default=30, validators=[MinValueValidator(1)])
    equipement = models.TextField(blank=True, help_text="Équipements disponibles (projecteur, tableau, etc.)")
    statut = models.CharField(
        max_length=20,
        choices=(
            ('DISPONIBLE', 'Disponible'),
            ('OCCUPEE', 'Occupée'),
            ('MAINTENANCE', 'En maintenance'),
        ),
        default='DISPONIBLE'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom} (Cap: {self.capacite})"


# 9. Cours (Planning)
class Cours(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='cours_plannifies')
    enseignant = models.ForeignKey(Professeur, on_delete=models.CASCADE, related_name='cours_plannifies')
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, related_name='cours_plannifies')
    salle = models.ForeignKey(Salle, on_delete=models.CASCADE, related_name='cours_plannifies')
    date = models.DateField()
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['date', 'salle']),
            models.Index(fields=['date', 'enseignant']),
        ]
        # Contrainte d'unicité pour éviter double réservation même créneau
        constraints = [
            models.UniqueConstraint(
                fields=['salle', 'date', 'heure_debut', 'heure_fin'],
                name='unique_salle_creneau'
            ),
            models.UniqueConstraint(
                fields=['enseignant', 'date', 'heure_debut', 'heure_fin'],
                name='unique_enseignant_creneau'
            ),
        ]

    def __str__(self):
        return f"{self.matiere.nom} - {self.date} {self.heure_debut.strftime('%H:%M')} ({self.salle.nom})"