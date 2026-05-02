# core/urls.py
from django.urls import path
from .views import (
    StudentDashboardStats,
    StudentCoursesView,
    StudentScheduleView,
    StudentBulletinView,
    TeacherCoursesView,
    TeacherStudentDetailView,
    TeacherGradesView,
    TokenAuthView,
    CurrentUserView,
    SeedDemoDataView,
    AdminStatsView,
    TeacherDashboardSummary,
    AdminUsersView,
    AdminCoursesView,
    AdminClassesView,
    AdminProfesseursView,
    AdminSettingsView,
    AdminSalleView,
    AdminCoursView,
    DisponibiliteSalleView,
    DisponibiliteEnseignantView,
)

urlpatterns = [
    # Authentication endpoints
    path('token/', TokenAuthView.as_view(), name='token'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('seed-data/', SeedDemoDataView.as_view(), name='seed-data'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    
    # Dashboard endpoints
    path('student/dashboard-stats/', StudentDashboardStats.as_view(), name='student-stats'),
    path('student/courses/', StudentCoursesView.as_view(), name='student-courses'),
    path('student/schedule/', StudentScheduleView.as_view(), name='student-schedule'),
    path('student/bulletin/', StudentBulletinView.as_view(), name='student-bulletin'),
    path('teacher/courses/', TeacherCoursesView.as_view(), name='teacher-courses'),
    path('teacher/exams/<uuid:exam_id>/grades/', TeacherGradesView.as_view(), name='teacher-grades'),
    path('teacher/exams/<uuid:exam_id>/bulk-save/', TeacherGradesView.as_view(), name='teacher-bulk-save'),
    path('teacher/students/<str:student_id>/', TeacherStudentDetailView.as_view(), name='teacher-student-detail'),
    path('teacher/dashboard/', TeacherDashboardSummary.as_view(), name='teacher-dashboard'),

    # Admin management endpoints
    path('admin/users/', AdminUsersView.as_view(), name='admin-users'),
    path('admin/users/<int:user_id>/', AdminUsersView.as_view(), name='admin-user-detail'),
    path('admin/courses/', AdminCoursesView.as_view(), name='admin-courses'),
    path('admin/courses/<uuid:course_id>/', AdminCoursesView.as_view(), name='admin-course-detail'),
    path('admin/classes/', AdminClassesView.as_view(), name='admin-classes'),
    path('admin/classes/<uuid:class_id>/', AdminClassesView.as_view(), name='admin-class-detail'),
    path('admin/professeurs/', AdminProfesseursView.as_view(), name='admin-professeurs'),
    path('admin/settings/', AdminSettingsView.as_view(), name='admin-settings'),
    
    # Nouveaux endpoints Gestion Salles & Cours
    path('admin/salles/', AdminSalleView.as_view(), name='admin-salles'),
    path('admin/salles/<uuid:salle_id>/', AdminSalleView.as_view(), name='admin-salle-detail'),
    path('admin/cours/', AdminCoursView.as_view(), name='admin-cours'),
    path('admin/cours/<uuid:cours_id>/', AdminCoursView.as_view(), name='admin-cours-detail'),
    path('admin/disponibilite/salle/', DisponibiliteSalleView.as_view(), name='dispo-salle'),
    path('admin/disponibilite/enseignant/', DisponibiliteEnseignantView.as_view(), name='dispo-enseignant'),
]