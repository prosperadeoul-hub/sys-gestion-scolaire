# core/urls.py
from django.urls import path
from .views import (
    StudentDashboardStats, 
    TeacherGradesView,
    TokenAuthView,
    CurrentUserView,
    SeedDemoDataView,
    AdminStatsView,
    TeacherDashboardSummary,
)

urlpatterns = [
    # Authentication endpoints
    path('token/', TokenAuthView.as_view(), name='token'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('seed-data/', SeedDemoDataView.as_view(), name='seed-data'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    
    # Dashboard endpoints
    path('student/dashboard-stats/', StudentDashboardStats.as_view(), name='student-stats'),
    path('teacher/exams/<int:exam_id>/grades/', TeacherGradesView.as_view(), name='teacher-grades'),
    path('teacher/exams/<int:exam_id>/bulk-save/', TeacherGradesView.as_view(), name='teacher-bulk-save'),
    path('teacher/dashboard/', TeacherDashboardSummary.as_view(), name='teacher-dashboard'),
]