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

class TeacherGradesView(APIView):
    """Gestion des notes par examen (Saisie en masse)"""
    
    def get(self, request, exam_id):
        # Récupère tous les étudiants de la promo liée à l'examen
        examen = Examen.objects.get(id=exam_id)
        students = Etudiant.objects.filter(promotion__matieres=examen.matiere)
        
        data = []
        for s in students:
            note = Note.objects.filter(etudiant=s, examen=examen).first()
            data.append({
                "etudiant_id": s.id,
                "nom": s.user.profile.full_name,
                "matricule": s.matricule,
                "note_id": note.id if note else None,
                "valeur": note.valeur if note else "",
                "commentaire": note.commentaire if note else ""
            })
        return Response(data)

    def post(self, request, exam_id):
        """Action de sauvegarde Bulk (Atomique)"""
        examen = Examen.objects.get(id=exam_id)
        grades_data = request.data.get('grades', [])

        with transaction.atomic(): # Si une note échoue, rien n'est sauvegardé
            for item in grades_data:
                Note.objects.update_or_create(
                    etudiant_id=item['etudiant_id'],
                    examen=examen,
                    defaults={
                        'valeur': item['valeur'],
                        'commentaire': item.get('commentaire', '')
                    }
                )
        return Response({"status": "success"})

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