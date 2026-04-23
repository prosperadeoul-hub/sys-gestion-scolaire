# EduManager - Application de Gestion Scolaire

Application web moderne de gestion scolaire développée avec **React (JSX)** et **CSS Pur**, connectée à un backend **Django REST Framework**.

## 🚀 Fonctionnalités

### Authentification
- Connexion sécurisée avec JWT Token
- Stockage du token dans le localStorage
- Déconnexion automatique en cas d'erreur 401
- Comptes démo pour tester rapidement (Admin, Teacher, Student)
- Initialisation de la base de données via un bouton Seed

### Tableau de Bord Dynamique
- Interface adaptative selon le rôle de l'utilisateur (ADMIN, TEACHER, STUDENT)
- Statistiques en temps réel
- Navigation intuitive avec Sidebar et Topbar
- Design responsive (mobile-friendly)

### Rôles Utilisateurs

#### 📊 Admin
- Vue d'ensemble de l'établissement
- Statistiques globales (utilisateurs, étudiants, professeurs, promotions)
- Suivi des frais de scolarité
- Gestion des promotions

#### 👨‍🏫 Teacher
- Gestion des matières enseignées
- Suivi des étudiants
- Saisie des notes
- Tableau de bord personnalisé

#### 🎓 Student
- Consultation des notes et moyennes
- Rang dans la promotion
- Suivi des matières inscrites
- État des frais de scolarité

## 🛠️ Stack Technique

### Frontend
- **React 19** avec JSX
- **CSS Pur** (pas de frameworks CSS)
- **Variables CSS** pour un design cohérent
- **React Router DOM** pour la navigation
- **Axios** pour les appels API
- **Context API** pour la gestion d'état global

### Backend
- **Django REST Framework**
- **Authentication Token**
- **API RESTful**

## 📁 Structure du Projet

```
frontend/
├── src/
│   ├── api/
│   │   └── axios.js              # Configuration Axios avec intercepteurs
│   ├── components/
│   │   ├── Sidebar.jsx/css       # Navigation latérale
│   │   └── Topbar.jsx/css        # Barre de navigation supérieure
│   ├── contexts/
│   │   └── AuthContext.jsx       # Contexte d'authentification
│   ├── pages/
│   │   ├── Login.jsx/css         # Page de connexion
│   │   └── Dashboard.jsx/css     # Tableau de bord dynamique
│   ├── App.jsx                   # Composant principal avec routage
│   ├── App.css                   # Styles globaux
│   ├── index.css                 # Reset CSS et base
│   └── main.jsx                  # Point d'entrée
└── package.json
```

## 🔧 Installation

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn
- Backend Django fonctionnel

### Étapes d'installation

1. **Installer les dépendances**
```bash
cd frontend
npm install
```

2. **Configurer le backend**
Assurez-vous que le backend Django est en cours d'exécution sur `http://127.0.0.1:8000`

3. **Lancer l'application**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## 🔑 Comptes Démo

Après avoir cliqué sur le bouton "🌱 Initialiser la base de données", utilisez les comptes suivants :

| Rôle      | Username  | Mot de passe   |
|-----------|-----------|----------------|
| Admin     | admin     | admin123       |
| Teacher   | teacher   | teacher123     |
| Student   | student   | student123     |

## 🎨 Design System

### Couleurs
- **Primaire** : Bleu `#2563eb`
- **Fond** : Gris très clair `#f9fafb`
- **Cartes** : Blanc `#ffffff`
- **Texte** : Système UI / Inter

### Typographie
- **Police** : Inter (Google Fonts)
- **Fallback** : system-ui, -apple-system, sans-serif

### Composants
- **Cartes de statistiques** : Design épuré avec icônes
- **Formulaires** : Inputs stylisés avec focus bleu
- **Boutons** : Effets de hover et transitions fluides
- **Sidebar** : Navigation responsive avec overlay mobile

## 📡 Endpoints API

### Authentication
- `POST /api/token/` - Connexion (username, password)
- `GET /api/me/` - Informations utilisateur actuel

### Dashboard
- `GET /api/admin/stats/` - Statistiques admin
- `GET /api/teacher/dashboard/` - Dashboard professeur
- `GET /api/student/dashboard-stats/` - Dashboard étudiant

### Utilitaires
- `POST /api/seed-data/` - Initialiser la base de données

## 🔒 Sécurité

- Token JWT stocké dans le localStorage
- Intercepteur Axios pour injection automatique du header `Authorization: Bearer <token>`
- Déconnexion automatique en cas d'expiration du token (401)
- Routes protégées avec PrivateRoute

## 📱 Responsive Design

L'application est entièrement responsive :
- **Desktop** : Sidebar fixe visible
- **Tablette/Mobile** : Sidebar coulissante avec overlay
- **Adaptation** des grilles de statistiques

## 🚀 Améliorations Futures

- [ ] Mode sombre
- [ ] Notifications en temps réel
- [ ] Export des données en PDF/Excel
- [ ] Chat interne
- [ ] Calendar intégré
- [ ] Gestion des absences
- [ ] Bulletin de notes imprimable

## 📄 Licence

Ce projet est développé dans le cadre d'un système de gestion scolaire.

## 👨‍💻 Développement

### Commandes disponibles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Prévisualisation
npm run preview

# Linting
npm run lint
```

## 🤝 Contribution

Pour contribuer au projet, veuillez suivre les étapes suivantes :
1. Forker le projet
2. Créer une branche de fonctionnalité
3. Committer les changements
4. Pusher vers la branche
5. Ouvrir une Pull Request

---

**Développé avec ❤️ pour l'éducation**
