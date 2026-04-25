import uuid
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from faker import Faker
from django.db.models import Count

from core.models import User, Promotion, Professeur, Etudiant, Matiere, Examen, Note

fake = Faker('fr_FR')

class Command(BaseCommand):
    help = "Génère des données de test complètes pour le système de gestion scolaire"

    def add_arguments(self, parser):
        parser.add_argument(
            '--students',
            type=int,
            default=50,
            help='Nombre d\'étudiants à créer (défaut: 50)'
        )
        parser.add_argument(
            '--teachers',
            type=int,
            default=8,
            help='Nombre d\'enseignants à créer (défaut: 8)'
        )
        parser.add_argument(
            '--subjects',
            type=int,
            default=12,
            help='Nombre de matières à créer (défaut: 12)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Supprimer toutes les données existantes avant le seed'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Suppression des données existantes...'))
            Note.objects.all().delete()
            Examen.objects.all().delete()
            Matiere.objects.all().delete()
            Etudiant.objects.all().delete()
            Professeur.objects.all().delete()
            Promotion.objects.all().delete()
            User.objects.filter(role='ETUDIANT').delete()
            User.objects.filter(role='ENSEIGNANT').delete()
            User.objects.filter(role='ADMIN').delete()
            self.stdout.write(self.style.SUCCESS('Données supprimées.\n'))

        self.stdout.write(self.style.NOTICE('=== Début du génération de données de test ===\n'))

        # 1. Créer un admin
        admin_user = self.create_admin()

        # 2. Créer les promotions
        promotions = self.create_promotions()

        # 3. Créer les enseignants
        teachers = self.create_teachers(options['teachers'])

        # 4. Créer les matières
        subjects = self.create_subjects(teachers, options['subjects'])

        # 5. Créer les examens
        exams = self.create_exams(subjects)

        # 6. Créer les étudiants
        students = self.create_students(options['students'], promotions)

        # 7. Assigner les matières aux promotions
        self.assign_subjects_to_promotions(subjects, promotions)

        # 8. Générer les notes
        self.generate_grades(students, exams)

        self.stdout.write(self.style.SUCCESS('\n=== Génération terminée avec succès ! ==='))
        self.print_summary(admin_user, teachers, students, subjects, exams, promotions)

    def create_admin(self):
        """Crée un compte administrateur"""
        self.stdout.write('Création de l\'administrateur...')
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@ecole.fr',
                'first_name': 'Jean',
                'last_name': 'Administrateur',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin.set_password('Admin123!')
            admin.save()
            self.stdout.write(self.style.SUCCESS(f'  [OK] Administrateur cree: {admin.username}'))
        else:
            self.stdout.write(self.style.WARNING(f'  [EXISTS] Administrateur existe deja: {admin.username}'))
        return admin

    def create_promotions(self):
        """Crée plusieurs promotions"""
        self.stdout.write('\nCréation des promotions...')
        promotions_data = [
            {'nom': 'Master 1 IA & Data Science', 'annee': 2025},
            {'nom': 'Master 2 IA & Data Science', 'annee': 2026},
            {'nom': 'Licence 3 Informatique', 'annee': 2025},
            {'nom': 'Master 1 Réseaux & Sécurité', 'annee': 2025},
            {'nom': 'Master 2 Génie Logiciel', 'annee': 2026},
            {'nom': 'Licence 2 Informatique', 'annee': 2024},
        ]

        promotions = []
        for data in promotions_data:
            promo, created = Promotion.objects.get_or_create(
                nom=data['nom'],
                annee=data['annee'],
                defaults={}
            )
            if created:
                self.stdout.write(f'  [OK] Promotion creee: {promo}')
            promotions.append(promo)

        self.stdout.write(self.style.SUCCESS(f'  {len(promotions)} promotions créées'))
        return promotions

    def create_teachers(self, count):
        """Crée des enseignants"""
        self.stdout.write(f'\nCréation de {count} enseignants...')
        specialites = ['Intelligence Artificielle', 'Réseaux', 'Génie Logiciel', 'Base de données', 
                       'Cybersécurité', 'Cloud Computing', 'Machine Learning', 'DevOps', 'Architecture']

        teachers = []
        for i in range(count):
            first_name = fake.first_name_male()
            last_name = fake.last_name()
            username = f"prof_{fake.user_name()[:10]}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': fake.email(),
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'ENSEIGNANT',
                }
            )
            if created:
                user.set_password('Prof123!')
                user.save()

            prof, prof_created = Professeur.objects.get_or_create(
                user=user,
                defaults={'specialite': random.choice(specialites)}
            )
            if prof_created:
                teachers.append(prof)
                self.stdout.write(f'  [OK] Enseignant cree: {user.get_full_name()} ({prof.specialite})')

        self.stdout.write(self.style.SUCCESS(f'  {len(teachers)} enseignants créés'))
        return teachers

    def create_subjects(self, teachers, count):
        """Crée des matières"""
        self.stdout.write(f'\nCréation de {count} matières...')
        categories = ['TECH', 'SOFT', 'LANG', 'SCIE']
        
        subjects_data = [
            ('Intelligence Artificielle', 'IA101'),
            ('Machine Learning', 'ML201'),
            ('Réseaux Informatiques', 'RSN101'),
            ('Bases de données', 'BDD101'),
            ('Développement Web', 'WEB101'),
            ('Sécurité informatique', 'SEC101'),
            ('Cloud Computing', 'CLD101'),
            ('Algorithmique', 'ALG101'),
            ('Programmation Orientée Objet', 'POO101'),
            ('Systèmes d\'exploitation', 'SYS101'),
            ('Analyse de données', 'ANA101'),
            ('Deep Learning', 'DL301'),
            ('DevOps', 'OPS101'),
            ('Cybersécurité avancée', 'SEC201'),
            ('Architecture logicielle', 'ARCH201'),
            ('XML & Services Web', 'XML101'),
            ('Base de données avancée', 'BDD201'),
            ('Intelligence Artificielle avancée', 'IA301'),
        ]

        subjects = []
        for i in range(count):
            data = subjects_data[i % len(subjects_data)]
            code = f"{data[1]}{i+1:03d}" if i >= len(subjects_data) else data[1]

            prof = random.choice(teachers) if teachers else None

            subject, created = Matiere.objects.get_or_create(
                code=code,
                defaults={
                    'nom': f"{data[0]} {i+1}" if i >= len(subjects_data) else data[0],
                    'coefficient': random.choice([1, 2, 3, 4, 5]),
                    'categorie': random.choice(categories),
                    'professeur': prof,
                }
            )
            if created:
                subjects.append(subject)
                self.stdout.write(f'  [OK] Matiere creee: {subject} (coeff: {subject.coefficient})')

        self.stdout.write(self.style.SUCCESS(f'  {len(subjects)} matieres crees'))
        return subjects

    def create_exams(self, subjects):
        """Crée des examens pour chaque matière"""
        self.stdout.write(f'\nCréation des examens...')
        exams = []
        today = timezone.now().date()

        for subject in subjects:
            # Créer 1-2 examens par matière
            num_exams = random.randint(1, 2)
            for j in range(num_exams):
                exam_date = today + timedelta(days=random.randint(10, 60))
                exam_name = f"Examen Final" if j == 0 else f"Contrôle Continu {j}"

                exam, created = Examen.objects.get_or_create(
                    matiere=subject,
                    nom=exam_name,
                    defaults={'date_examen': exam_date}
                )
                if created:
                    exams.append(exam)
                    self.stdout.write(f'  [OK] Examen cree: {exam} ({exam.date_examen})')

        self.stdout.write(self.style.SUCCESS(f'  {len(exams)} examens créés'))
        return exams

    def create_students(self, count, promotions):
        """Crée des étudiants"""
        self.stdout.write(f'\nCréation de {count} étudiants...')
        students = []

        for i in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"etu_{fake.user_name()[:10]}"
            promo = random.choice(promotions) if promotions else None

            # Générer un matricule unique
            annee = promo.annee if promo else random.randint(2023, 2026)
            matricule = f"ETU{annee}{i+1:04d}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': fake.email(),
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'ETUDIANT',
                }
            )
            if created:
                user.set_password('Etudiant123!')
                user.save()

                # Créer le profil étudiant
                etudiant = Etudiant.objects.create(
                    user=user,
                    promotion=promo,
                    matricule=matricule,
                    frais_scolarite_total=Decimal(random.choice([3000, 3500, 4000, 4500])),
                    frais_payes=Decimal(random.uniform(0, 3000)).quantize(Decimal('0.00'))
                )
                students.append(etudiant)
                self.stdout.write(f'  [OK] Etudiant cree: {user.get_full_name()} ({matricule}) - {promo.nom if promo else "Aucune promotion"}')

        self.stdout.write(self.style.SUCCESS(f'  {len(students)} étudiants créés'))
        return students

    def assign_subjects_to_promotions(self, subjects, promotions):
        """Assigne les matières aux promotions en garantissant que chaque promotion a au moins une matière"""
        self.stdout.write('\nAssignation des matières aux promotions...')
        
        # Étape 1: Pour chaque matière, assigner à 1-3 promotions aléatoires
        for subject in subjects:
            k = random.randint(1, min(3, len(promotions)))
            promo_subset = random.sample(promotions, k=k)
            subject.promotions.set(promo_subset)
            self.stdout.write(f'  [OK] {subject} assigné à: {", ".join(p.nom for p in promo_subset)}')
        
        # Étape 2: Vérifier les promotions sans matière et corriger
        from core.models import Promotion  # pour être sûr
        promos_without = []
        for promotion in promotions:
            count = Matiere.objects.filter(promotions=promotion).count()
            if count == 0:
                promos_without.append(promotion)
        
        if promos_without:
            self.stdout.write(f'  [FIX] {len(promos_without)} promotions sans matière, correction...')
            for promotion in promos_without:
                # Ajouter cette promotion à une matière aléatoire (en plus de ses promotions existantes)
                subject = random.choice(subjects)
                subject.promotions.add(promotion)
                self.stdout.write(f'  [FIX] {subject} ajouté à {promotion.nom}')

    def generate_grades(self, students, exams):
        """Génère des notes pour tous les étudiants"""
        self.stdout.write(f'\nGénération des notes...')
        total_grades = 0

        for student in students:
            # Chaque étudiant a des notes pour certains examens (pas tous)
            student_exams = random.sample(exams, k=random.randint(3, min(10, len(exams))))

            for exam in student_exams:
                # Génération de notes réalistes (distribution normale approximative)
                # 20% de chance d'avoir une note < 10
                if random.random() < 0.2:
                    note = Decimal(random.uniform(2, 9.5)).quantize(Decimal('0.00'))
                else:
                    note = Decimal(random.uniform(10, 19.99)).quantize(Decimal('0.00'))

                # 5% de chance d'avoir une note parfaite (20)
                if random.random() < 0.05:
                    note = Decimal('20.00')

                Note.objects.get_or_create(
                    etudiant=student,
                    examen=exam,
                    defaults={
                        'valeur': note,
                        'commentaire': fake.sentence() if random.random() < 0.3 else ''
                    }
                )
                total_grades += 1

        self.stdout.write(self.style.SUCCESS(f'  {total_grades} notes générées'))

    def print_summary(self, admin, teachers, students, subjects, exams, promotions):
        """Affiche un résumé des données créées"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.NOTICE('RESUME DES DONNEES GENEREES'))
        self.stdout.write('='*50)
        self.stdout.write(f'[ADMIN] Administrateurs:     {User.objects.filter(role="ADMIN").count()}')
        self.stdout.write(f'[PROF]  Enseignants:          {User.objects.filter(role="ENSEIGNANT").count()}')
        self.stdout.write(f'[ETU]   Etudiants:            {User.objects.filter(role="ETUDIANT").count()}')
        self.stdout.write(f'[PROMO] Promotions:           {Promotion.objects.count()}')
        self.stdout.write(f'[MAT]   Matieres:             {Matiere.objects.count()}')
        self.stdout.write(f'[EXAM]  Examens:              {Examen.objects.count()}')
        self.stdout.write(f'[NOTE]  Notes:                {Note.objects.count()}')
        self.stdout.write('='*50)
        self.stdout.write('\n Codes d\'accès par défaut:')
        self.stdout.write(f'  Admin:    admin / Admin123!')
        self.stdout.write(f'  Profs:    prof_[nom] / Prof123!')
        self.stdout.write(f'  Étudiants: etu_[nom] / Etudiant123!')
        self.stdout.write('='*50)
