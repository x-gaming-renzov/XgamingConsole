import jsPDF from 'jspdf';
import type { ExperimentCompassResponse } from '@shared/schema';

export function generatePDFReport(data: ExperimentCompassResponse) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let currentY = margin;

  // Helper function to add new page if needed
  const checkNewPage = (height: number) => {
    if (currentY + height > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }
  };

  // Helper function to wrap text
  const addWrappedText = (text: string, x: number, fontSize: number, maxWidth: number, fontStyle: 'normal' | 'bold' = 'normal') => {
    pdf.setFontSize(fontSize);
    if (fontStyle === 'bold') {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    const lines = pdf.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.4;
    
    checkNewPage(lines.length * lineHeight + 5);
    
    lines.forEach((line: string, index: number) => {
      pdf.text(line, x, currentY + (index + 1) * lineHeight);
    });
    
    currentY += lines.length * lineHeight + 5;
    return lines.length * lineHeight;
  };

  // Title
  pdf.setFillColor(88, 28, 135); // Purple background
  pdf.rect(0, 0, pageWidth, 40, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Experiment Compass Report', margin, 25);
  
  currentY = 50;
  pdf.setTextColor(0, 0, 0);

  // Executive Summary
  addWrappedText('EXECUTIVE SUMMARY', margin, 16, maxWidth, 'bold');
  
  const totalInsights = data.summary?.counts?.insights_total || 0;
  const criticalIssues = data.summary?.counts?.negative || 0;
  const positiveSignals = data.summary?.counts?.positive || 0;
  const experimentsCount = data.experiments?.length || 0;

  addWrappedText(
    `This report analyzes ${totalInsights} player insights, identifying ${criticalIssues} critical issues and ${positiveSignals} positive signals. Based on this analysis, ${experimentsCount} targeted experiments are recommended to optimize player experience and engagement.`,
    margin, 12, maxWidth
  );

  // Insights Summary
  addWrappedText('INSIGHTS BREAKDOWN', margin, 16, maxWidth, 'bold');
  
  if (data.summary?.counts) {
    const { by_severity } = data.summary.counts;
    addWrappedText(
      `Severity Distribution:\n• High Priority: ${by_severity.HIGH} issues\n• Medium Priority: ${by_severity.MEDIUM} issues\n• Low Priority: ${by_severity.LOW} issues`,
      margin, 12, maxWidth
    );
  }

  // Key Insights
  if (data.insights && data.insights.length > 0) {
    addWrappedText('KEY INSIGHTS', margin, 16, maxWidth, 'bold');
    
    data.insights.slice(0, 5).forEach((insight, index) => {
      const frequency = Math.round(insight.frequency_score * 100);
      addWrappedText(
        `${index + 1}. [${insight.severity}] ${insight.category} - ${insight.subcategory}`,
        margin, 12, maxWidth, 'bold'
      );
      addWrappedText(
        `${insight.summary} (Frequency: ${frequency}%)`,
        margin + 5, 11, maxWidth - 5
      );
    });
  }

  // Sample Reviews Section
  if (data.insights && data.insights.length > 0) {
    checkNewPage(30);
    addWrappedText('SAMPLE PLAYER FEEDBACK', margin, 16, maxWidth, 'bold');
    
    const sampleEvidence = data.insights
      .flatMap(i => i.evidence)
      .filter(e => e.excerpt)
      .slice(0, 3);

    sampleEvidence.forEach((evidence, index) => {
      const rating = evidence.rating ? `★ ${evidence.rating}` : '';
      addWrappedText(
        `Review ${index + 1} ${rating}`,
        margin, 12, maxWidth, 'bold'
      );
      addWrappedText(
        `"${evidence.excerpt}"`,
        margin + 5, 11, maxWidth - 5
      );
    });
  }

  // Experiments Section
  if (data.experiments && data.experiments.length > 0) {
    checkNewPage(40);
    addWrappedText('AI-SUGGESTED EXPERIMENTS', margin, 16, maxWidth, 'bold');
    
    data.experiments.forEach((experiment, index) => {
      checkNewPage(35);
      
      addWrappedText(
        `${index + 1}. ${experiment.title}`,
        margin, 14, maxWidth, 'bold'
      );
      
      addWrappedText(
        `Mode: ${experiment.recommended_mode} | Type: ${experiment.experiment_type}`,
        margin + 5, 11, maxWidth - 5
      );
      
      addWrappedText(
        `Goal: ${experiment.goal_metric.name}`,
        margin + 5, 11, maxWidth - 5
      );
      
      if (experiment.guardrail_metrics && experiment.guardrail_metrics.length > 0) {
        const guardrails = experiment.guardrail_metrics.map(m => m.name).join(', ');
        addWrappedText(
          `Guardrails: ${guardrails}`,
          margin + 5, 11, maxWidth - 5
        );
      }
      
      addWrappedText(
        experiment.rationale,
        margin + 5, 11, maxWidth - 5
      );
      
      if (experiment.confidence) {
        addWrappedText(
          `Confidence: ${Math.round(experiment.confidence * 100)}%`,
          margin + 5, 11, maxWidth - 5
        );
      }
    });
  }

  // Methodology Section
  checkNewPage(50);
  addWrappedText('METHODOLOGY & EXPERIMENTAL APPROACHES', margin, 16, maxWidth, 'bold');
  
  addWrappedText('Sparrow (Multi-Armed Bandit)', margin, 14, maxWidth, 'bold');
  addWrappedText(
    'Speed over certainty. Adaptive allocation that quickly identifies winning variants. Best for tactical wins and rapid iteration. Uses dynamic traffic allocation based on real-time performance.',
    margin + 5, 11, maxWidth - 5
  );
  
  addWrappedText('Shifu (Traditional A/B Testing)', margin, 14, maxWidth, 'bold');
  addWrappedText(
    'Certainty over speed. Fixed allocation with statistical rigor. Provides stakeholder-ready confidence intervals and definitive results. Best for major feature decisions and regulatory compliance.',
    margin + 5, 11, maxWidth - 5
  );

  // Footer
  const finalY = pageHeight - 15;
  pdf.setFontSize(10);
  pdf.setTextColor(128, 128, 128);
  pdf.text('Generated by Nova Experiment Compass by XGaming', margin, finalY);
  pdf.text(new Date().toLocaleDateString(), pageWidth - margin - 30, finalY);

  return pdf;
}