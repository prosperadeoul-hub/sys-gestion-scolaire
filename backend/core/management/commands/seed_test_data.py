import uuid
import random
from datetime import date, timedelta, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from faker import Faker
from django.db.models import Count

from core.models import User, Promotion, Professeur, Etudiant, Matiere, Examen, Note, Salle, Cours

fake = Faker('fr_FR')


class Command(BaseCommand):
    help = "Génère des données de test complètes pour le système de gestion scolaire"

    def add_arguments(self, parser):
        parser.add_argument(
            '--students',
            type=int,
            default=30,
            help='Nombre d\'étudiants à créer (défaut: 30)'
        )
        parser.add_argument(
            '--teachers',
            type=int,
            default=5,
            help='Nombre d\'enseignants à créer (défaut: 5)'
        )
        parser.add_argument(
            '--subjects',
            type=int,
            default=8,
            help='Nombre de matières à créer (défaut: 8)'
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
            Cours.objects.all().delete()
            Matiere.objects.all().delete()
            Salle.objects.all().delete()
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

        # 8. Créer les salles
        rooms = self.create_rooms()

        # 9. Programmer les cours (planning)
        self.schedule_courses(teachers, subjects, promotions, rooms)

        # 10. Générer les notes
        self.generate_grades(students, exams)

        self.stdout.write(self.style.SUCCESS('\n=== Génération terminée avec succès ! ==='))
        self.print_summary(admin_user, teachers, students, subjects, exams, promotions)

    def create_admin(self):
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

        self.stdout.write(self.style.SUCCESS(f'  {len(promotions)} promotions crees'))
        return promotions

    def create_teachers(self, count):
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

        self.stdout.write(self.style.SUCCESS(f'  {len(teachers)} enseignants crees'))
        return teachers

    def create_subjects(self, teachers, count):
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
        self.stdout.write(f'\nCréation des examens...')
        exams = []
        today = timezone.now().date()

        for subject in subjects:
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
        self.stdout.write(f'\nCréation de {count} étudiants...')
        students = []

        for i in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"etu_{fake.user_name()[:10]}"
            promo = random.choice(promotions) if promotions else None

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
        self.stdout.write('\nAssignation des matières aux promotions...')
        for subject in subjects:
            promo_subset = random.sample(promotions, k=random.randint(1, min(3, len(promotions))))
            subject.promotions.set(promo_subset)
            self.stdout.write(f'  [OK] {subject} assigné à: {", ".join(p.nom for p in promo_subset)}')

    def create_rooms(self):
        self.stdout.write('\nCréation des salles...')
        rooms_data = [
            {'nom': 'Amphi A', 'capacite': 100, 'equipement': 'Projecteur, Tableau, Son', 'statut': 'DISPONIBLE'},
            {'nom': 'Amphi B', 'capacite': 80, 'equipement': 'Projecteur, Tableau', 'statut': 'DISPONIBLE'},
            {'nom': 'Salle 101', 'capacite': 30, 'equipement': 'Projecteur, Tableau', 'statut': 'DISPONIBLE'},
            {'nom': 'Salle 102', 'capacite': 30, 'equipement': 'Projecteur', 'statut': 'DISPONIBLE'},
            {'nom': 'Salle 103', 'capacite': 25, 'equipement': 'Tableau', 'statut': 'DISPONIBLE'},
            {'nom': 'Salle 201', 'capacite': 40, 'equipement': 'Projecteur, Son', 'statut': 'DISPONIBLE'},
            {'nom': 'Salle 202', 'capacite': 40, 'equipement': 'Projecteur, Tableau, Son', 'statut': 'DISPONIBLE'},
            {'nom': 'Laboratoire L1', 'capacite': 20, 'equipement': 'PC, Projecteur', 'statut': 'DISPONIBLE'},
            {'nom': 'Laboratoire L2', 'capacite': 20, 'equipement': 'PC, Tableau', 'statut': 'DISPONIBLE'},
            {'nom': 'Salle 301', 'capacite': 35, 'equipement': 'Projecteur', 'statut': 'OCCUPEE'},
        ]

        salles = []
        for data in rooms_data:
            salle, created = Salle.objects.get_or_create(
                nom=data['nom'],
                defaults={
                    'capacite': data['capacite'],
                    'equipement': data['equipement'],
                    'statut': data['statut']
                }
            )
            if created:
                self.stdout.write(f'  [OK] Salle créée: {salle.nom} (Cap: {salle.capacite})')
            salles.append(salle)

        self.stdout.write(self.style.SUCCESS(f'  {len(salles)} salles créées'))
        return salles

    def schedule_courses(self, teachers, subjects, promotions, salles):
        self.stdout.write('\nCréation du planning de cours...')
        count = 0

        base_date = timezone.now().date()
        days = [base_date + timedelta(days=i) for i in range(1, 11)]

        for i, subject in enumerate(subjects):
            prof = subject.professeur
            if not prof:
                continue

            promos = subject.promotions.all()
            if not promos:
                continue

            promo = promos[0]
            available_salles = [s for s in salles if s.statut in ['DISPONIBLE', 'OCCUPEE']]
            if not available_salles:
                continue
            salle = random.choice(available_salles)

            jour = random.choice(days)
            heure_debut = time(random.choice([8, 10, 14, 16]), 0)
            heure_fin = time((heure_debut.hour + 2) % 24, 0)

            try:
                cours, created = Cours.objects.get_or_create(
                    matiere=subject,
                    enseignant=prof,
                    promotion=promo,
                    salle=salle,
                    date=jour,
                    defaults={
                        'heure_debut': heure_debut,
                        'heure_fin': heure_fin,
                        'notes': f'Cours de {subject.nom}'
                    }
                )
                if created:
                    count += 1
                    self.stdout.write(f'  [OK] Cours: {subject.nom} - {jour} {heure_debut.strftime("%H:%M")} ({salle.nom})')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  [SKIP] Conflit pour {subject.nom}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS(f'  {count} cours programmés'))
        return count

    def generate_grades(self, students, exams):
        self.stdout.write(f'\nGénération des notes...')
        total_grades = 0

        for student in students:
            student_exams = random.sample(exams, k=random.randint(3, min(10, len(exams))))

            for exam in student_exams:
                if random.random() < 0.2:
                    note = Decimal(random.uniform(2, 9.5)).quantize(Decimal('0.00'))
                else:
                    note = Decimal(random.uniform(10, 19.99)).quantize(Decimal('0.00'))

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
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.NOTICE('RESUME DES DONNEES GENEREES'))
        self.stdout.write('='*50)
        self.stdout.write(f'[ADMIN] Administrateurs:     {User.objects.filter(role="ADMIN").count()}')
        self.stdout.write(f'[PROF]  Enseignants:          {User.objects.filter(role="ENSEIGNANT").count()}')
        self.stdout.write(f'[ETU]   Etudiants:            {User.objects.filter(role="ETUDIANT").count()}')
        self.stdout.write(f'[PROMO] Promotions:           {Promotion.objects.count()}')
        self.stdout.write(f'[MAT]   Matieres:             {Matiere.objects.count()}')
        self.stdout.write(f'[SALLE] Salles:               {Salle.objects.count()}')
        self.stdout.write(f'[COURS] Cours planifiés:      {Cours.objects.count()}')
        self.stdout.write(f'[EXAM]  Examens:              {Examen.objects.count()}')
        self.stdout.write(f'[NOTE]  Notes:                {Note.objects.count()}')
        self.stdout.write('='*50)
        self.stdout.write('\n Codes d\'accès par défaut:')
        self.stdout.write(f'  Admin:    admin / Admin123!')
        self.stdout.write(f'  Profs:    prof_[nom] / Prof123!')
        self.stdout.write(f'  Etudiants: etu_[nom] / Etudiant123!')
        self.stdout.write('='*50)