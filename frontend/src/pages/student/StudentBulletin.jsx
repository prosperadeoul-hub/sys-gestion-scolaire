import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FileText, User, Award, TrendingUp, BookOpen, Calendar, 
  GraduationCap, Printer, Download, BarChart3, Target, Clock, Building2
} from 'lucide-react';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './StudentBulletin.css';

const StudentBulletin = () => {
  const { user, role } = useAuth();
  const [bulletinData, setBulletinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBulletin = async () => {
      if (!role || role !== 'ETUDIANT') {
        setError("Accès refusé : Cette page est réservée aux étudiants.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('student/bulletin/');
        setBulletinData(response.data);
      } catch (error) {
        if (error.response) {
          if (error.response.status === 403) {
            setError("Accès refusé : Vérifiez que vous êtes connecté en tant qu'étudiant");
          } else {
            setError(`Erreur ${error.response.status}: ${error.response.data?.detail || 'Erreur inconnue'}`);
          }
        } else {
          setError("Erreur de connexion au serveur");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBulletin();
  }, [user, role]);

  // Fonction pour obtenir la couleur en fonction de la note
  const getGradeColor = (note) => {
    if (note === null || note === undefined) return '#6b7280';
    if (note >= 16) return '#10b981';
    if (note >= 14) return '#3b82f6';
    if (note >= 12) return '#8b5cf6';
    if (note >= 10) return '#f59e0b';
    return '#ef4444';
  };

  // Fonction pour obtenir la couleur de fond en fonction de la note
  const getGradeBgColor = (note) => {
    if (note === null || note === undefined) return '#f3f4f6';
    if (note >= 16) return '#ecfdf5';
    if (note >= 14) return '#eff6ff';
    if (note >= 12) return '#f5f3ff';
    if (note >= 10) return '#fffbeb';
    return '#fef2f2';
  };

  // Fonction pour obtenir le libellé de la note
  const getGradeLabel = (note) => {
    if (note === null || note === undefined) return 'Non noté';
    if (note >= 16) return 'Très Bien';
    if (note >= 14) return 'Bien';
    if (note >= 12) return 'Assez Bien';
    if (note >= 10) return 'Passable';
    return 'Insuffisant';
  };

  // Fonction pour imprimer le bulletin
  const handlePrint = () => {
    window.print();
  };

  // Fonction pour télécharger le bulletin en PDF
  const handleDownloadPDF = () => {
    if (!bulletinData) return;

    const { etudiant, matieres, moyenne_generale, rang, total_etudiants } = bulletinData;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Helper function to add text with word wrap
    const addText = (text, x, y, options = {}) => {
      const { maxWidth = contentWidth, lineHeight = 7, fontSize = 10, bold = false, color = '#000000' } = options;
      doc.setFontSize(fontSize);
      doc.setTextColor(color);
      if (bold) doc.setFont(undefined, 'bold');
      else doc.setFont(undefined, 'normal');

      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * lineHeight;
    };

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.setTextColor('#1e3a8a');
    doc.text('EduManager', margin, y);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor('#6b7280');
    doc.text('Système de Gestion Scolaire', margin, y + 8);

    y += 20;

    // Bulletin title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor('#111827');
    doc.text('BULLETIN SCOLAIRE', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Divider line
    doc.setDrawColor('#e5e7eb');
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Student Information
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor('#111827');
    doc.text('Informations Étudiant', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor('#374151');
    
    const studentInfo = [
      `Nom et Prénom: ${etudiant.nom}`,
      `Matricule: ${etudiant.matricule}`,
      `Promotion: ${etudiant.promotion?.nom || 'Non assigné'}`,
      `Année: ${etudiant.promotion?.annee || 'N/A'}`,
    ];

    studentInfo.forEach(info => {
      doc.text(info, margin + 5, y);
      y += 6;
    });

    y += 10;

    // Summary Stats
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor('#111827');
    doc.text('Résumé', margin, y);
    y += 10;

    // Summary table
    const summaryData = [
      ['Moyenne Générale', moyenne_generale?.toFixed(2) || '0.00'],
      ['Rang', `${rang || 0} / ${total_etudiants || 0}`],
      ['Nombre de Matières', matieres.length],
    ];

    doc.autoTable({
      startY: y,
      head: [['Statistique', 'Valeur']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });

    y = doc.lastAutoTable.finalY + 15;

    // Subject Grades Table
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor('#111827');
    doc.text('Détail des Notes par Matière', margin, y);
    y += 10;

    // Build table data for all subjects and exams
    const tableData = [];
    
    matieres.forEach((matiere, index) => {
      // Subject row (merged across columns in header)
      const subjectRow = [
        {
          content: `${matiere.nom} (${matiere.code})`,
          colSpan: 4,
          styles: { 
            fillColor: [243, 244, 246],
            fontStyle: 'bold',
            fontSize: 10
          }
        },
        '',
        '',
        ''
      ];
      tableData.push(subjectRow);

      // Add separator
      tableData.push(['', '', '', '']);

      // Exam rows
      if (matiere.examens && matiere.examens.length > 0) {
        matiere.examens.forEach(exam => {
          const examDate = exam.date ? new Date(exam.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
          }) : 'N/A';
          
          const noteDisplay = exam.note !== null ? `${exam.note}/20` : '–';
          
          tableData.push([
            `  └ ${exam.nom}`,
            examDate,
            matiere.coefficient.toString(),
            noteDisplay,
          ]);
        });
      }

      // Average row
      const avgRow = [
        '',
        '',
        { content: 'Moyenne:', styles: { fontStyle: 'bold', textColor: [55, 65, 81] } },
        `${matiere.moyenne?.toFixed(2) || '0.00'}/20`
      ];
      tableData.push(avgRow);
      
      // Empty row for spacing
      tableData.push(['', '', '', '']);
    });

    // Generate table
    doc.autoTable({
      startY: y,
      head: [['Matière / Examen', 'Date', 'Coef', 'Note']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineColor: [229, 231, 235],
        lineWidth: 0.5
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      didParseCell: function(data) {
        // Style subject header rows (which have colSpan in body)
        if (data.row.section === 'body' && data.column.index === 0) {
          const cell = data.cell;
          // Check if this cell has colSpan property (subject header rows)
          if (cell && cell.colSpan) {
            cell.styles.fillColor = [249, 250, 251];
            cell.styles.fontStyle = 'bold';
            cell.styles.fontSize = 10;
          }
        }
      }
    });

    y = doc.lastAutoTable.finalY + 20;

    // Footer section
    if (y + 40 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
    }

    // Signature section
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor('#374151');
    
    const signatureY = y + 10;
    const lineWidth = 50;
    const center = pageWidth / 2;

    // Student signature
    doc.setFont(undefined, 'italic');
    doc.text('Signature de l\'étudiant', center - 70, signatureY, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.line(center - 70 - lineWidth/2, signatureY + 3, center - 70 + lineWidth/2, signatureY + 3);

    // Responsible signature
    doc.setFont(undefined, 'italic');
    doc.text('Signature du responsable', center + 70, signatureY, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.line(center + 70 - lineWidth/2, signatureY + 3, center + 70 + lineWidth/2, signatureY + 3);

    // Generation date
    const generationDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.setFontSize(8);
    doc.setTextColor('#9ca3af');
    doc.text(`Bulletin généré le ${generationDate}`, pageWidth / 2, signatureY + 20, { align: 'center' });

    // Save PDF
    const filename = `bulletin_${etudiant.matricule}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="bulletin-page">
        <div className="page-header">
          <div className="header-content">
            <h1><FileText size={32} /> Mon Bulletin</h1>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de votre bulletin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bulletin-page">
        <div className="page-header">
          <div className="header-content">
            <h1><FileText size={32} /> Mon Bulletin</h1>
          </div>
        </div>
        <div className="error-container">
          <div className="error-message">
            <FileText size={48} />
            <h3>Erreur de chargement</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bulletinData) {
    return (
      <div className="bulletin-page">
        <div className="page-header">
          <div className="header-content">
            <h1><FileText size={32} /> Mon Bulletin</h1>
          </div>
        </div>
        <div className="empty-state">
          <FileText size={64} />
          <h3>Aucun bulletin disponible</h3>
          <p>Vos données ne sont pas encore disponibles.</p>
        </div>
      </div>
    );
  }

  const { etudiant, matieres, moyenne_generale, rang, total_etudiants } = bulletinData;

  return (
    <div className="bulletin-page">
      {/* Actions (impression/téléchargement) - cachées lors de l'impression */}
      <div className="bulletin-actions no-print">
        <button className="action-btn print-btn" onClick={handlePrint}>
          <Printer size={18} />
          Imprimer
        </button>
        <button className="action-btn download-btn" onClick={handleDownloadPDF}>
          <Download size={18} />
          Télécharger PDF
        </button>
      </div>

      {/* En-tête du bulletin */}
      <div className="bulletin-header">
        <div className="header-top">
          <div className="school-info">
            <h2>EduManager</h2>
            <p>Système de Gestion Scolaire</p>
          </div>
          <div className="bulletin-title">
            <FileText size={24} />
            <h1>BULLETIN SCOLAIRE</h1>
          </div>
        </div>

        <div className="header-divider"></div>

        {/* Infos étudiant */}
        <div className="student-info-section">
          <div className="info-row">
            <div className="info-group">
              <label><User size={14} /> Nom et Prénom</label>
              <span className="info-value">{etudiant.nom}</span>
            </div>
            <div className="info-group">
              <label><GraduationCap size={14} /> Matricule</label>
              <span className="info-value badge">{etudiant.matricule}</span>
            </div>
            <div className="info-group">
              <label><Building2 size={14} /> Promotion</label>
              <span className="info-value">{etudiant.promotion?.nom || 'Non assigné'}</span>
            </div>
            <div className="info-group">
              <label><Calendar size={14} /> Année</label>
              <span className="info-value">{etudiant.promotion?.annee || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé global */}
      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: getGradeColor(moyenne_generale) }}>
            <TrendingUp size={24} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Moyenne Générale</span>
            <span className="summary-value" style={{ color: getGradeColor(moyenne_generale) }}>
              {moyenne_generale?.toFixed(2) || '0.00'}/20
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon rank">
            <Award size={24} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Rang</span>
            <span className="summary-value">
              {rang || 0} / {total_etudiants || 0}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon subjects">
            <BookOpen size={24} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Matières</span>
            <span className="summary-value">{matieres.length}</span>
          </div>
        </div>
      </div>

      {/* Bulletin détaillé par matière */}
      <div className="details-section">
        <h3>
          <BarChart3 size={20} />
          Détail des Notes par Matière
        </h3>

        <div className="subjects-bulletin">
          {matieres.map((matiere) => {
            const moyColor = getGradeColor(matiere.moyenne);
            const moyLabel = getGradeLabel(matiere.moyenne);

            return (
              <div key={matiere.id} className="subject-card">
                <div className="subject-header">
                  <div className="subject-title">
                    <BookOpen size={18} />
                    <span>{matiere.nom}</span>
                    <span className="subject-code">{matiere.code}</span>
                  </div>
                  <div className="subject-meta">
                    {matiere.professeur?.nom && (
                      <span className="professor">
                        <User size={14} /> {matiere.professeur.nom}
                      </span>
                    )}
                    <span className="coefficient">
                      Coef: {matiere.coefficient}
                    </span>
                  </div>
                </div>

                <div className="subject-grades">
                  {matiere.examens && matiere.examens.length > 0 ? (
                    matiere.examens.map((exam) => {
                      const examColor = getGradeColor(exam.note);
                      const examLabel = getGradeLabel(exam.note);

                      return (
                        <div key={exam.id} className="exam-grade-card">
                          <div className="exam-name">
                            <Target size={14} />
                            <span>{exam.nom}</span>
                          </div>
                          <div className="exam-date">
                            <Clock size={12} />
                            <span>{new Date(exam.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short'
                            })}</span>
                          </div>
                          <div 
                            className="grade-badge"
                            style={{ 
                              backgroundColor: getGradeBgColor(exam.note),
                              color: getGradeColor(exam.note),
                              border: `2px solid ${getGradeColor(exam.note)}`
                            }}
                          >
                            {exam.note !== null ? `${exam.note}/20` : '–'}
                          </div>
                          <span className="grade-status" style={{ color: examColor }}>
                            {examLabel}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-exams">Aucun examen enregistré</div>
                  )}
                </div>

                {/* Moyenne de la matière */}
                <div className="subject-footer">
                  <div className="moyenne-label">Moyenne</div>
                  <div 
                    className="moyenne-value"
                    style={{ 
                      color: moyColor,
                      borderColor: moyColor
                    }}
                  >
                    <span className="value">{matiere.moyenne?.toFixed(2) || '0.00'}</span>
                    <span className="max">/20</span>
                  </div>
                  <span 
                    className="moyenne-status"
                    style={{ 
                      backgroundColor: getGradeBgColor(matiere.moyenne),
                      color: getGradeColor(matiere.moyenne)
                    }}
                  >
                    {moyLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pied de page - signature */}
      <div className="bulletin-footer">
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-line"></div>
            <span>Signature de l'étudiant</span>
          </div>
          <div className="signature-box">
            <div className="signature-line"></div>
            <span>Signature du responsable</span>
          </div>
        </div>
        <div className="generation-date">
          Bulletin généré le {new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentBulletin;
