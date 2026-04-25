from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Avg, Count, Sum, Window, F
from django.db.models.functions import Rank
from .models import Etudiant, Note, Matiere, Examen, Professeur, Promotion, User
from .serializers import MatiereSerializer, ExamenSerializer, StudentGradeSerializer

class StudentDashboardStats(APIView):
    def get(self, request):
        try:
            student = Etudiant.objects.get(user=request.user)
            # Calcul du rang via SQL Window Function (très performant)
            students_with_avg = Etudiant.objects.filter(promotion=student.promotion).annotate(
                moyenne=Avg('notes__valeur')
            ).annotate(
                rank=Window(expression=Rank(), order_by=F('moyenne').desc())
            )
            
            my_stats = next(s for s in students_with_avg if s.id == student.id)
            matieres = Matiere.objects.filter(promotions=student.promotion)

            return Response({
                "etudiant": {"id": student.id, "matricule": student.matricule},
                "moyenne_generale": round(my_stats.moyenne or 0, 2),
                "rang": my_stats.rank,
                "total_etudiants": students_with_avg.count(),
                "solde_restant": student.frais_scolarite_total - student.frais_payes,
                "matieres": MatiereSerializer(matieres, many=True).data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class StudentCoursesView(APIView):
    """Vue pour que les étudiants puissent voir leurs cours"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Vérifier que l'utilisateur est un étudiant
            if request.user.role != 'ETUDIANT':
                return Response({"detail": "Accès réservé aux étudiants."}, status=status.HTTP_403_FORBIDDEN)
            
            student = Etudiant.objects.get(user=request.user)
            
            # Récupérer toutes les matières de la promotion de l'étudiant
            matieres = Matiere.objects.filter(
                promotions=student.promotion
            ).select_related('professeur').prefetch_related('examens')
            
            courses_data = []
            for matiere in matieres:
                # Récupérer les notes de l'étudiant pour cette matière
                examens_notes = []
                for examen in matiere.examens.all():
                    note = Note.objects.filter(etudiant=student, examen=examen).first()
                    examens_notes.append({
                        'id': str(examen.id),
                        'nom': examen.nom,
                        'date': examen.date_examen,
                        'note': float(note.valeur) if note else None,
                        'coefficient': matiere.coefficient
                    })
                
                # Calculer la moyenne de la matière
                notes_values = [n['note'] for n in examens_notes if n['note'] is not None]
                moyenne_matiere = sum(notes_values) / len(notes_values) if notes_values else None
                
                courses_data.append({
                    'id': str(matiere.id),
                    'nom': matiere.nom,
                    'code': matiere.code,
                    'coefficient': matiere.coefficient,
                    'categorie': matiere.categorie,
                    'professeur': {
                        'id': str(matiere.professeur.id) if matiere.professeur else None,
                        'nom': f"Prof. {matiere.professeur.user.last_name}" if matiere.professeur else None,
                    } if matiere.professeur else None,
                    'examens': examens_notes,
                    'moyenne': round(moyenne_matiere, 2) if moyenne_matiere else None,
                    'credits': matiere.coefficient * 10,  # Exemple de calcul de crédits
                })
            
            return Response({
                'etudiant': {
                    'id': str(student.id),
                    'nom': f"{student.user.first_name} {student.user.last_name}",
                    'matricule': student.matricule,
                    'promotion': str(student.promotion) if student.promotion else None,
                },
                'cours': courses_data,
                'moyenne_generale': round(
                    sum(c['moyenne'] * c['coefficient'] for c in courses_data if c['moyenne']) /
                    sum(c['coefficient'] for c in courses_data), 2
                ) if any(c['moyenne'] for c in courses_data) else None
            })
            
        except Etudiant.DoesNotExist:
            return Response({"detail": "Profil étudiant non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Erreur: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class StudentScheduleView(APIView):
    """Rend un emploi du temps simple pour l'étudiant (démo).
    Construit une semaine en répartissant les matières si il n'existe pas de modèle de planning.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ETUDIANT':
            return Response({"detail": "Accès réservé aux étudiants."}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = Etudiant.objects.get(user=request.user)
            matieres = list(Matiere.objects.filter(promotions=student.promotion))

            days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
            schedule = {day: [] for day in days}

            # Répartir les matières sur la semaine (simple round-robin)
            for i, mat in enumerate(matieres):
                day = days[i % len(days)]
                schedule[day].append({
                    'matiere': mat.nom,
                    'heure_debut': '08:00',
                    'heure_fin': '10:00',
                    'salle': 'A' + str((i % 10) + 1),
                    'professeur': f"Prof. {mat.professeur.user.last_name}" if mat.professeur else None,
                })

            return Response({'schedule': schedule})
        except Etudiant.DoesNotExist:
            return Response({"detail": "Profil étudiant non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Erreur: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class TeacherGradesView(APIView):
    """Gestion des notes par examen (Saisie en masse)"""
    def get(self, request, exam_id):
        # Only allow teachers who teach the exam's matiere to view
        if request.user.role != 'ENSEIGNANT':
            return Response({"detail": "Accès réservé aux enseignants."}, status=status.HTTP_403_FORBIDDEN)

        try:
            prof = Professeur.objects.get(user=request.user)
            examen = Examen.objects.get(id=exam_id)
            if examen.matiere.professeur != prof:
                return Response({"detail": "Accès interdit : examen non assigné à cet enseignant."}, status=status.HTTP_403_FORBIDDEN)

            students = Etudiant.objects.filter(promotion__in=examen.matiere.promotions.all()).select_related('user')
            data = []
            for s in students:
                note = Note.objects.filter(etudiant=s, examen=examen).first()
                data.append({
                    "etudiant_id": str(s.id),
                    "nom": f"{s.user.first_name} {s.user.last_name}",
                    "matricule": s.matricule,
                    "note_id": str(note.id) if note else None,
                    "valeur": float(note.valeur) if note and note.valeur is not None else None,
                    "commentaire": note.commentaire if note else ""
                })
            return Response(data)
        except Examen.DoesNotExist:
            return Response({"detail": "Examen non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Professeur.DoesNotExist:
            return Response({"detail": "Profil enseignant non trouvé."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, exam_id):
        """Action de sauvegarde Bulk (Atomique) - teachers only for their exams"""
        if request.user.role != 'ENSEIGNANT':
            return Response({"detail": "Accès réservé aux enseignants."}, status=status.HTTP_403_FORBIDDEN)

        try:
            prof = Professeur.objects.get(user=request.user)
            examen = Examen.objects.get(id=exam_id)
            if examen.matiere.professeur != prof:
                return Response({"detail": "Accès interdit : examen non assigné à cet enseignant."}, status=status.HTTP_403_FORBIDDEN)

            grades_data = request.data.get('grades', [])
            with transaction.atomic(): # Si une note échoue, rien n'est sauvegardé
                for item in grades_data:
                    etudiant_id = item.get('etudiant_id')
                    # ensure student belongs to a promotion linked to this matiere
                    if not Etudiant.objects.filter(id=etudiant_id, promotion__in=examen.matiere.promotions.all()).exists():
                        return Response({"detail": f"Étudiant {etudiant_id} non autorisé pour cet examen."}, status=status.HTTP_403_FORBIDDEN)

                    Note.objects.update_or_create(
                        etudiant_id=etudiant_id,
                        examen=examen,
                        defaults={
                            'valeur': item['valeur'],
                            'commentaire': item.get('commentaire', '')
                        }
                    )
            return Response({"status": "success"})
        except Examen.DoesNotExist:
            return Response({"detail": "Examen non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Professeur.DoesNotExist:
            return Response({"detail": "Profil enseignant non trouvé."}, status=status.HTTP_404_NOT_FOUND)


class TeacherCoursesView(APIView):
    """Retourne les cours assignés à l'enseignant avec la liste des étudiants et leurs notes."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ENSEIGNANT':
            return Response({"detail": "Accès réservé aux enseignants."}, status=status.HTTP_403_FORBIDDEN)

        try:
            prof = Professeur.objects.get(user=request.user)
            # Support server-side filtering by promotion and matiere
            promotion_id = request.GET.get('promotion_id') or request.GET.get('promotion')
            matiere_id = request.GET.get('matiere_id') or request.GET.get('matiere')

            base_qs = Matiere.objects.filter(professeur=prof).prefetch_related('examens', 'promotions')
            if matiere_id:
                base_qs = base_qs.filter(id=matiere_id)
            if promotion_id:
                base_qs = base_qs.filter(promotions__id=promotion_id)

            matieres = base_qs

            # build available filters (promotions) for the frontend
            all_matieres = Matiere.objects.filter(professeur=prof).prefetch_related('promotions')
            promotions_set = {}
            for m in all_matieres:
                for p in m.promotions.all():
                    promotions_set[str(p.id)] = str(p)
            available_promotions = [{'id': pid, 'nom': name} for pid, name in promotions_set.items()]

            result = []
            for mat in matieres:
                # Récupérer toutes les promotions liées à la matière
                promotions = list(mat.promotions.all())
                # Récupérer tous les étudiants pour ces promotions
                students_qs = Etudiant.objects.filter(promotion__in=promotions).select_related('user')

                students = []
                for s in students_qs:
                    examens_notes = []
                    for examen in mat.examens.all():
                        note = Note.objects.filter(etudiant=s, examen=examen).first()
                        examens_notes.append({
                            'id': str(examen.id),
                            'nom': examen.nom,
                            'date': examen.date_examen,
                            'note': float(note.valeur) if note else None,
                        })

                    students.append({
                        'id': str(s.id),
                        'nom': f"{s.user.first_name} {s.user.last_name}",
                        'matricule': s.matricule,
                        'examens': examens_notes,
                    })

                result.append({
                    'id': str(mat.id),
                    'nom': mat.nom,
                    'code': mat.code,
                    'coefficient': mat.coefficient,
                    'examens': [ {'id': str(e.id), 'nom': e.nom, 'date': e.date_examen} for e in mat.examens.all() ],
                    'students': students,
                })

            # Also return available filters so frontend can render selects
            return Response({'cours': result, 'filters': {'promotions': available_promotions}})
        except Professeur.DoesNotExist:
            return Response({"detail": "Profil enseignant non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Erreur: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

# core/views.py
class TeacherDashboardSummary(APIView):
    def get(self, request):
        # On récupère les infos de base pour l'enseignant
        try:
            prof = Professeur.objects.get(user=request.user)
            matieres = Matiere.objects.filter(professeur=prof)
            
            return Response({
                "nom": request.user.get_full_name(),
                "nombre_matieres": matieres.count(),
                "matieres": MatiereSerializer(matieres, many=True).data
            })
        except Professeur.DoesNotExist:
            return Response({"error": "Profil enseignant non trouvé"}, status=404)


class AdminStatsView(APIView):
    """Statistics endpoint for the admin overview dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        total_users = User.objects.count()
        total_students = Etudiant.objects.count()
        total_teachers = Professeur.objects.count()
        total_promotions = Promotion.objects.count()

        total_frais = Etudiant.objects.aggregate(total=Sum('frais_scolarite_total'))['total'] or 0
        total_paye = Etudiant.objects.aggregate(total=Sum('frais_payes'))['total'] or 0

        promotion_averages = []
        for promo in Promotion.objects.all():
            avg = Etudiant.objects.filter(promotion=promo).aggregate(avg=Avg('notes__valeur'))['avg'] or 0
            promotion_averages.append({
                'nom': str(promo),
                'moyenne': round(avg, 2)
            })

        return Response({
            'total_users': total_users,
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_promotions': total_promotions,
            'total_frais': float(total_frais),
            'total_paye': float(total_paye),
            'promotion_averages': promotion_averages,
        })


class TeacherStudentDetailView(APIView):
    """Détail d'un étudiant pour l'enseignant: exams + notes. GET pour lire, POST pour modifier les notes."""
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        if request.user.role != 'ENSEIGNANT':
            return Response({"detail": "Accès réservé aux enseignants."}, status=status.HTTP_403_FORBIDDEN)

        try:
            prof = Professeur.objects.get(user=request.user)
            student = Etudiant.objects.get(id=student_id)

            # Récupérer uniquement les examens des matières que l'enseignant enseigne
            examens = Examen.objects.filter(matiere__professeur=prof).select_related('matiere')

            exams_data = []
            for ex in examens:
                note = Note.objects.filter(etudiant=student, examen=ex).first()
                exams_data.append({
                    'id': str(ex.id),
                    'nom': ex.nom,
                    'date': ex.date_examen,
                    'matiere': {'id': str(ex.matiere.id), 'nom': ex.matiere.nom},
                    'note': float(note.valeur) if note and note.valeur is not None else None,
                    'commentaire': note.commentaire if note else ''
                })

            return Response({
                'etudiant': {
                    'id': str(student.id),
                    'nom': f"{student.user.first_name} {student.user.last_name}",
                    'matricule': student.matricule,
                    'promotion': str(student.promotion) if student.promotion else None,
                },
                'examens': exams_data
            })
        except Professeur.DoesNotExist:
            return Response({"detail": "Profil enseignant non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Etudiant.DoesNotExist:
            return Response({"detail": "Étudiant non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Erreur: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, student_id):
        if request.user.role != 'ENSEIGNANT':
            return Response({"detail": "Accès réservé aux enseignants."}, status=status.HTTP_403_FORBIDDEN)

        try:
            prof = Professeur.objects.get(user=request.user)
            student = Etudiant.objects.get(id=student_id)
            grades = request.data.get('grades', [])

            with transaction.atomic():
                for g in grades:
                    exam_id = g.get('exam_id') or g.get('examen_id') or g.get('exam')
                    valeur = g.get('valeur')
                    commentaire = g.get('commentaire', '')
                    if not exam_id:
                        continue
                    examen = Examen.objects.get(id=exam_id)
                    # vérifier que l'enseignant enseigne cette matière
                    if examen.matiere.professeur != prof:
                        return Response({"detail": "Accès interdit pour cet examen."}, status=status.HTTP_403_FORBIDDEN)

                    Note.objects.update_or_create(
                        etudiant=student,
                        examen=examen,
                        defaults={
                            'valeur': valeur,
                            'commentaire': commentaire
                        }
                    )

            return Response({'status': 'success'})
        except Professeur.DoesNotExist:
            return Response({"detail": "Profil enseignant non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Etudiant.DoesNotExist:
            return Response({"detail": "Étudiant non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Examen.DoesNotExist:
            return Response({"detail": "Examen non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Erreur: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


# ==================== AUTHENTICATION VIEWS ====================

class TokenAuthView(APIView):
    """
    Generate authentication token for a user.
    Accepts username and password, returns token.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'detail': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response(
                {'detail': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create token for user
        token, _ = Token.objects.get_or_create(user=user)
        
        # Build user data
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
        }
        
        # Get profile data based on role
        profile_data = {
            'id': str(user.id),
            'role': user.role,
            'full_name': f"{user.first_name} {user.last_name}".strip(),
            'email': user.email,
        }
        
        return Response({
            'access': token.key,
            'user': user_data,
            'profile': profile_data
        })


class CurrentUserView(APIView):
    """
    Get current authenticated user information.
    Requires Bearer token authentication.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Build user data
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
        }
        
        # Get profile data based on role
        profile_data = {
            'id': str(user.id),
            'role': user.role,
            'full_name': f"{user.first_name} {user.last_name}".strip(),
            'email': user.email,
        }
        
        return Response({
            'user': user_data,
            'profile': profile_data
        })


class SeedDemoDataView(APIView):
    """
    Seed database with demo data.
    Runs the seed_demo management command.
    """
    permission_classes = [AllowAny]
    def post(self, request):
        try:
            from django.core.management import call_command
            call_command('seed_demo')
            return Response({
                'status': 'success',
                'message': 'Demo data seeded successfully'
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


# ==================== ADMIN MANAGEMENT VIEWS ====================

class AdminUsersView(APIView):
    """Admin view for managing users"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.all().order_by('-date_joined')
        user_data = []

        for user in users:
            profile_data = {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'date_joined': user.date_joined.strftime('%Y-%m-%d'),
            }

            # Add profile-specific data
            if user.role == 'ETUDIANT':
                try:
                    etudiant = Etudiant.objects.get(user=user)
                    profile_data.update({
                        'matricule': etudiant.matricule,
                        'promotion': str(etudiant.promotion) if etudiant.promotion else None,
                        'frais_total': float(etudiant.frais_scolarite_total),
                        'frais_payes': float(etudiant.frais_payes),
                    })
                except Etudiant.DoesNotExist:
                    pass
            elif user.role == 'ENSEIGNANT':
                try:
                    prof = Professeur.objects.get(user=user)
                    profile_data.update({
                        'specialite': prof.specialite,
                        'matieres_count': prof.matieres.count(),
                    })
                except Professeur.DoesNotExist:
                    pass

            user_data.append(profile_data)

        return Response(user_data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        role = data.get('role')

        # Create base user
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role=role
        )

        # Create role-specific profile
        if role == 'ETUDIANT':
            Etudiant.objects.create(
                user=user,
                matricule=data['matricule'],
                promotion_id=data.get('promotion_id'),
                frais_scolarite_total=data.get('frais_total', 0),
                frais_payes=data.get('frais_payes', 0)
            )
        elif role == 'ENSEIGNANT':
            Professeur.objects.create(
                user=user,
                specialite=data.get('specialite', '')
            )

        return Response({"status": "success", "user_id": str(user.id)}, status=status.HTTP_201_CREATED)

    def put(self, request, user_id=None):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if not user_id:
            return Response({"detail": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        # Update base user fields
        for field in ['username', 'email', 'first_name', 'last_name', 'is_active']:
            if field in data:
                setattr(user, field, data[field])
        user.save()

        # Update role-specific profile
        if user.role == 'ETUDIANT':
            try:
                etudiant = Etudiant.objects.get(user=user)
                for field in ['matricule', 'promotion_id', 'frais_scolarite_total', 'frais_payes']:
                    if field in data:
                        if field == 'promotion_id':
                            etudiant.promotion_id = data[field]
                        else:
                            setattr(etudiant, field, data[field])
                etudiant.save()
            except Etudiant.DoesNotExist:
                pass
        elif user.role == 'ENSEIGNANT':
            try:
                prof = Professeur.objects.get(user=user)
                if 'specialite' in data:
                    prof.specialite = data['specialite']
                    prof.save()
            except Professeur.DoesNotExist:
                pass

        return Response({"status": "success"})

    def delete(self, request, user_id=None):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if not user_id:
            return Response({"detail": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response({"status": "success"})
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)


class AdminCoursesView(APIView):
    """Admin view for managing courses (matieres)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        courses = Matiere.objects.all().select_related('professeur').prefetch_related('promotions')
        course_data = []

        for course in courses:
            course_data.append({
                'id': str(course.id),
                'nom': course.nom,
                'code': course.code,
                'coefficient': course.coefficient,
                'categorie': course.categorie,
                'professeur': {
                    'id': str(course.professeur.id) if course.professeur else None,
                    'nom': str(course.professeur) if course.professeur else None,
                } if course.professeur else None,
                'promotions': [
                    {
                        'id': str(p.id),
                        'nom': str(p),
                        'annee': p.annee
                    } for p in course.promotions.all()
                ],
                'examens_count': course.examens.count(),
            })

        return Response(course_data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        course = Matiere.objects.create(
            nom=data['nom'],
            code=data['code'],
            coefficient=data.get('coefficient', 1),
            categorie=data.get('categorie', 'TECH'),
            professeur_id=data.get('professeur_id')
        )

        if 'promotion_ids' in data:
            course.promotions.set(data['promotion_ids'])

        return Response({"status": "success", "course_id": str(course.id)}, status=status.HTTP_201_CREATED)

    def put(self, request, course_id=None):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if not course_id:
            return Response({"detail": "Course ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Matiere.objects.get(id=course_id)
        except Matiere.DoesNotExist:
            return Response({"detail": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        for field in ['nom', 'code', 'coefficient', 'categorie', 'professeur_id']:
            if field in data:
                setattr(course, field, data[field])
        course.save()

        if 'promotion_ids' in data:
            course.promotions.set(data['promotion_ids'])

        return Response({"status": "success"})

    def delete(self, request, course_id=None):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if not course_id:
            return Response({"detail": "Course ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Matiere.objects.get(id=course_id)
            course.delete()
            return Response({"status": "success"})
        except Matiere.DoesNotExist:
            return Response({"detail": "Course not found"}, status=status.HTTP_404_NOT_FOUND)


class AdminClassesView(APIView):
    """Admin view for managing classes (promotions)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        classes = Promotion.objects.all().prefetch_related('etudiants', 'matieres_programme')
        class_data = []

        for cls in classes:
            class_data.append({
                'id': str(cls.id),
                'nom': cls.nom,
                'annee': cls.annee,
                'etudiants_count': cls.etudiants.count(),
                'matieres_count': cls.matieres_programme.count(),
                'capacite': cls.etudiants.count(),
                'status': 'active' if cls.annee >= 2024 else 'inactive',
            })

        return Response(class_data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        cls = Promotion.objects.create(
            nom=data['nom'],
            annee=data['annee']
        )

        return Response({"status": "success", "class_id": str(cls.id)}, status=status.HTTP_201_CREATED)

    def put(self, request, class_id=None):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if not class_id:
            return Response({"detail": "Class ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cls = Promotion.objects.get(id=class_id)
        except Promotion.DoesNotExist:
            return Response({"detail": "Class not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        for field in ['nom', 'annee']:
            if field in data:
                setattr(cls, field, data[field])
        cls.save()

        return Response({"status": "success"})

    def delete(self, request, class_id=None):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if not class_id:
            return Response({"detail": "Class ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cls = Promotion.objects.get(id=class_id)
            cls.delete()
            return Response({"status": "success"})
        except Promotion.DoesNotExist:
            return Response({"detail": "Class not found"}, status=status.HTTP_404_NOT_FOUND)


class AdminProfesseursView(APIView):
    """Admin view for listing professors"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        profs = Professeur.objects.all().select_related('user')
        prof_data = []

        for prof in profs:
            prof_data.append({
                'id': str(prof.id),
                'user_id': str(prof.user.id),
                'full_name': prof.user.get_full_name() or prof.user.username,
                'username': prof.user.username,
                'email': prof.user.email,
                'specialite': prof.specialite or '',
                'matieres_count': prof.matieres.count(),
            })

        return Response(prof_data)


class AdminSettingsView(APIView):
    """Admin view for managing system settings"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        # For now, return default settings. In a real app, you'd store these in the database
        settings = {
            'system_name': 'EduManager',
            'academic_year': '2024-2025',
            'max_students_per_class': 30,
            'default_fees': 500000.00,
            'grading_scale': '20-point',
            'language': 'fr',
            'timezone': 'Africa/Douala',
            'email_notifications': True,
            'sms_notifications': False,
            'auto_backup': True,
            'backup_frequency': 'daily',
        }

        return Response(settings)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        # In a real implementation, you'd save these to a Settings model
        # For now, just return success
        return Response({"status": "success", "message": "Settings saved successfully"})