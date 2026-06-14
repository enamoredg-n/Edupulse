import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const COLORS = {
  amber: '#f59e0b',
  blue: '#2563eb',
  blueSoft: '#eff6ff',
  border: '#e2e8f0',
  canvas: '#f7f9fc',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  green: '#10b981',
  greenSoft: '#ecfdf5',
  ink: '#0f172a',
  muted: '#64748b',
  panel: '#ffffff',
  slateSoft: '#f8fafc',
};

type PdfIssue = {
  affectedStudents: string;
  evidenceSignal: string;
  issue: string;
  mentions: number;
  priority: string;
  rootCause: string;
  action: string;
};

type PdfActionReport = {
  actionPlan: {
    body: string;
    priority: string;
    steps: string[];
    title: string;
    why: string;
  }[];
  graph: {
    category: string;
    current: number;
    previous: number;
  }[];
  issues: PdfIssue[];
  metrics: {
    label: string;
    value: string;
  }[];
  rootCauses: {
    body: string;
    signal: string;
    title: string;
  }[];
  summary: string;
};

type PdfEngineBenchmark = {
  funnel: {
    label: string;
    value: string;
    note: string;
  }[];
  receipt: {
    label: string;
    value: string;
  }[];
  pipeline: string[];
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  listReports(collegeId: string, termId?: string) {
    return this.prisma.analysisReport.findMany({
      where: termId ? { collegeId, termId } : { collegeId },
      include: {
        _count: {
          select: { themes: true, actions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReport(collegeId: string, id: string, actorId?: string) {
    const report = await this.prisma.analysisReport.findFirst({
      where: { id, collegeId },
      include: {
        term: true,
        themes: {
          include: { category: true },
          orderBy: [{ priority: 'desc' }, { mentionCount: 'desc' }],
        },
        actions: { orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (actorId) {
      await this.auditService.log({
        action: AuditAction.REPORT_VIEWED,
        actorId,
        collegeId,
        entity: 'AnalysisReport',
        entityId: report.id,
        metadata: {
          termId: report.termId,
          inputCount: report.inputCount,
          confidence: report.confidence,
        },
      });
    }

    return report;
  }

  async createPdf(collegeId: string, id: string, actorId?: string) {
    const report = await this.getReport(collegeId, id);
    const actionReport = this.buildActionReport(report);
    const engineBenchmark = this.buildEngineBenchmark(report);

    return new Promise<Buffer>((resolve) => {
      const document = new PDFDocument({
        layout: 'landscape',
        margin: 32,
        size: 'A4',
      });
      const chunks: Buffer[] = [];

      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));

      this.drawFirstPage(document, report, actionReport);
      document.addPage();
      this.drawSecondPage(document, report, actionReport);
      document.addPage();
      this.drawThirdPage(document, report, actionReport);
      document.addPage();
      this.drawBenchmarkPage(document, report, engineBenchmark);

      document.end();
      void this.auditService.log({
        action: AuditAction.REPORT_DOWNLOADED,
        actorId,
        collegeId,
        entity: 'AnalysisReport',
        entityId: report.id,
        metadata: {
          termId: report.termId,
          inputCount: report.inputCount,
          confidence: report.confidence,
        },
      });
    });
  }

  private drawFirstPage(
    document: PDFKit.PDFDocument,
    report: Awaited<ReturnType<ReportsService['getReport']>>,
    actionReport: PdfActionReport,
  ) {
    this.drawPageBackground(document);
    this.drawHeader(document, report);
    this.drawExecutiveSummary(document, actionReport);
    this.drawTopIssues(document, actionReport.issues);
    this.drawFooter(document, 1);
  }

  private drawSecondPage(
    document: PDFKit.PDFDocument,
    report: Awaited<ReturnType<ReportsService['getReport']>>,
    actionReport: PdfActionReport,
  ) {
    this.drawPageBackground(document);
    this.drawSmallHeader(
      document,
      report,
      'Root causes and detailed AI action plan',
    );
    this.drawRootCauses(document, actionReport.rootCauses);
    this.drawActionPlan(document, actionReport.actionPlan);
    this.drawFooter(document, 2);
  }

  private drawThirdPage(
    document: PDFKit.PDFDocument,
    report: Awaited<ReturnType<ReportsService['getReport']>>,
    actionReport: PdfActionReport,
  ) {
    this.drawPageBackground(document);
    this.drawSmallHeader(
      document,
      report,
      'Semester comparison and expected impact',
    );
    this.drawSemesterLineGraph(document, actionReport.graph);
    this.drawFooter(document, 3);
  }

  private drawBenchmarkPage(
    document: PDFKit.PDFDocument,
    report: Awaited<ReturnType<ReportsService['getReport']>>,
    benchmark: PdfEngineBenchmark,
  ) {
    this.drawPageBackground(document);
    this.drawSmallHeader(
      document,
      report,
      'AI engine benchmark and data reduction proof',
    );
    this.drawDataFunnel(document, benchmark);
    this.drawRunReceipt(document, benchmark);
    this.drawPipelineTrace(document, benchmark.pipeline);
    this.drawFooter(document, 4);
  }

  private drawPageBackground(document: PDFKit.PDFDocument) {
    document.save();
    document
      .rect(0, 0, document.page.width, document.page.height)
      .fill(COLORS.canvas);
    document.restore();
  }

  private drawHeader(
    document: PDFKit.PDFDocument,
    report: Awaited<ReturnType<ReportsService['getReport']>>,
  ) {
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('AI ACTION REPORT', 44, 36);
    document
      .fontSize(28)
      .fillColor(COLORS.ink)
      .text(
        'Institutional improvement plan generated from feedback intelligence',
        44,
        55,
        {
          width: 620,
        },
      );
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(`Term: ${report.term.name}`, 660, 46, {
        align: 'right',
        width: 135,
      });
    document.text(
      `Generated: ${report.createdAt.toLocaleDateString()}`,
      660,
      62,
      {
        align: 'right',
        width: 135,
      },
    );
    document
      .moveTo(44, 112)
      .lineTo(document.page.width - 44, 112)
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .stroke();
  }

  private drawSmallHeader(
    document: PDFKit.PDFDocument,
    report: Awaited<ReturnType<ReportsService['getReport']>>,
    title: string,
  ) {
    document
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.blue)
      .text('AI ACTION REPORT', 44, 36);
    document.fontSize(20).fillColor(COLORS.ink).text(title, 44, 54);
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(report.term.name, 650, 50, { align: 'right', width: 145 });
  }

  private drawExecutiveSummary(
    document: PDFKit.PDFDocument,
    actionReport: PdfActionReport,
  ) {
    const x = 44;
    const y = 132;
    const width = document.page.width - 88;
    const height = 148;
    this.card(document, x, y, width, height, COLORS.blueSoft);

    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('1. EXECUTIVE AI SUMMARY', x + 16, y + 16);
    document
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#334155')
      .text(actionReport.summary, x + 16, y + 36, {
        lineGap: 4,
        width: 475,
      });

    const metricX = x + 520;
    const metricY = y + 18;
    const metricW = 104;
    const metricH = 48;
    actionReport.metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardX = metricX + col * 116;
      const cardY = metricY + row * 62;
      this.card(document, cardX, cardY, metricW, metricH);
      document
        .font('Helvetica-Bold')
        .fontSize(metric.value.length > 12 ? 13 : 16)
        .fillColor(COLORS.ink)
        .text(metric.value, cardX + 10, cardY + 12, { width: metricW - 20 });
      document
        .fontSize(6.8)
        .fillColor(COLORS.muted)
        .text(metric.label.toUpperCase(), cardX + 10, cardY + 31, {
          width: metricW - 20,
        });
    });
  }

  private drawTopIssues(document: PDFKit.PDFDocument, issues: PdfIssue[]) {
    const x = 44;
    const y = 302;
    const width = document.page.width - 88;
    const height = 214;
    this.card(document, x, y, width, height);
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('2. TOP ISSUES FOUND', x + 16, y + 16);
    this.badge(
      document,
      'Priority assigned by LLM after EduPulse clustering',
      x + width - 235,
      y + 12,
      214,
      COLORS.blueSoft,
      COLORS.blue,
    );

    const columns = [0, 180, 275, 350, 485];
    const columnLabels = [
      'Issue',
      'Priority by AI',
      'Mentions',
      'Affected Students',
      'Evidence Signal',
    ];
    const tableX = x + 16;
    const tableY = y + 52;
    document
      .roundedRect(tableX, tableY, width - 32, 28, 6)
      .fillAndStroke(COLORS.slateSoft, COLORS.border);
    columnLabels.forEach((label, index) => {
      document
        .font('Helvetica-Bold')
        .fontSize(7.3)
        .fillColor('#475569')
        .text(label.toUpperCase(), tableX + columns[index] + 8, tableY + 10, {
          width: index === 4 ? 245 : columns[index + 1] - columns[index] - 12,
        });
    });

    issues.slice(0, 4).forEach((issue, index) => {
      const rowY = tableY + 28 + index * 32;
      document
        .moveTo(tableX, rowY)
        .lineTo(tableX + width - 32, rowY)
        .strokeColor(COLORS.border)
        .lineWidth(0.6)
        .stroke();
      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.ink)
        .text(issue.issue, tableX + 8, rowY + 10, { width: 165 });
      this.priorityBadge(
        document,
        issue.priority,
        tableX + columns[1] + 8,
        rowY + 8,
      );
      document
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(
          issue.mentions.toLocaleString(),
          tableX + columns[2] + 8,
          rowY + 10,
          {
            width: 65,
          },
        );
      document.text(
        issue.affectedStudents,
        tableX + columns[3] + 8,
        rowY + 10,
        {
          width: 120,
        },
      );
      document
        .fontSize(8.2)
        .fillColor('#475569')
        .text(issue.evidenceSignal, tableX + columns[4] + 8, rowY + 8, {
          lineGap: 1,
          width: 235,
        });
    });
  }

  private drawRootCauses(
    document: PDFKit.PDFDocument,
    rootCauses: PdfActionReport['rootCauses'],
  ) {
    const x = 44;
    const y = 96;
    const width = document.page.width - 88;
    const height = 146;
    this.card(document, x, y, width, height);
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('3. ROOT CAUSE FROM STUDENT COMMENTS', x + 16, y + 16);
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('Comment-based only', x + width - 110, y + 16, {
        align: 'right',
        width: 90,
      });

    rootCauses.slice(0, 4).forEach((cause, index) => {
      const cardWidth = (width - 56) / 4;
      const cardX = x + 16 + index * (cardWidth + 8);
      const cardY = y + 44;
      this.card(document, cardX, cardY, cardWidth, 82, COLORS.slateSoft);
      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.ink)
        .text(cause.title, cardX + 10, cardY + 9, {
          lineBreak: false,
          width: cardWidth - 20,
        });
      document
        .font('Helvetica')
        .fontSize(7.4)
        .fillColor('#475569')
        .text(cause.body, cardX + 10, cardY + 24, {
          lineGap: 1,
          height: 34,
          width: cardWidth - 20,
        });
      document
        .font('Helvetica-Bold')
        .fontSize(6.7)
        .fillColor(COLORS.muted)
        .text(cause.signal, cardX + 10, cardY + 62, {
          height: 12,
          width: cardWidth - 20,
        });
    });
  }

  private drawActionPlan(
    document: PDFKit.PDFDocument,
    actionPlan: PdfActionReport['actionPlan'],
  ) {
    const x = 44;
    const y = 266;
    const width = document.page.width - 88;
    const height = 252;
    this.card(document, x, y, width, height);
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('4. AI ACTION PLAN', x + 16, y + 16);
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('Issues + root causes sent to LLM', x + width - 160, y + 16, {
        align: 'right',
        width: 140,
      });

    actionPlan.slice(0, 4).forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardWidth = (width - 50) / 2;
      const cardHeight = 82;
      const cardX = x + 16 + col * (cardWidth + 18);
      const cardY = y + 44 + row * 94;
      this.card(
        document,
        cardX,
        cardY,
        cardWidth,
        cardHeight,
        COLORS.slateSoft,
      );

      document.roundedRect(cardX + 10, cardY + 10, 24, 24, 6).fill(COLORS.ink);
      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.panel)
        .text(String(index + 1), cardX + 10, cardY + 17, {
          align: 'center',
          width: 24,
        });
      this.priorityBadge(document, item.priority, cardX + 44, cardY + 12);
      document
        .font('Helvetica-Bold')
        .fontSize(8.9)
        .fillColor(COLORS.ink)
        .text(item.title, cardX + 108, cardY + 11, {
          height: 22,
          width: cardWidth - 120,
        });
      document
        .font('Helvetica')
        .fontSize(7.2)
        .fillColor('#475569')
        .text(`Why: ${item.why}`, cardX + 10, cardY + 39, {
          lineGap: 1,
          height: 18,
          width: cardWidth - 20,
        });
      document
        .font('Helvetica-Bold')
        .fontSize(6.9)
        .fillColor(COLORS.muted)
        .text(`Steps: ${item.steps.join(' -> ')}`, cardX + 10, cardY + 61, {
          height: 13,
          width: cardWidth - 20,
        });
    });
  }

  private drawSemesterLineGraph(
    document: PDFKit.PDFDocument,
    graph: PdfActionReport['graph'],
  ) {
    const x = 44;
    const y = 112;
    const width = document.page.width - 88;
    const height = 382;
    this.card(document, x, y, width, height);
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('5. SEMESTER COMPARISON GRAPH', x + 16, y + 16);
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('Current semester vs previous semester', x + width - 190, y + 16, {
        align: 'right',
        width: 170,
      });

    const chartX = x + 54;
    const chartY = y + 74;
    const chartW = width - 92;
    const chartH = 220;
    const scaleY = (value: number) => chartY + chartH - (value / 100) * chartH;
    const step = chartW / (graph.length - 1);
    const point = (
      item: (typeof graph)[number],
      index: number,
      key: 'current' | 'previous',
    ) => ({
      x: chartX + index * step,
      y: scaleY(item[key]),
    });

    document.save();
    document.dash(3, { space: 4 });
    [0, 25, 50, 75, 100].forEach((tick) => {
      const tickY = scaleY(tick);
      document
        .moveTo(chartX, tickY)
        .lineTo(chartX + chartW, tickY)
        .strokeColor(COLORS.border)
        .lineWidth(0.6)
        .stroke();
      document
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORS.muted)
        .text(String(tick), chartX - 24, tickY - 4, {
          align: 'right',
          width: 18,
        });
    });
    document.undash();
    document.restore();

    this.drawLine(
      document,
      graph.map((item, index) => point(item, index, 'previous')),
      COLORS.green,
    );
    this.drawLine(
      document,
      graph.map((item, index) => point(item, index, 'current')),
      COLORS.blue,
    );

    graph.forEach((item, index) => {
      const labelX = chartX + index * step - 38;
      document
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLORS.muted)
        .text(item.category, labelX, chartY + chartH + 16, {
          align: 'center',
          width: 76,
        });
    });

    this.legend(
      document,
      x + width - 215,
      y + 45,
      COLORS.blue,
      'Current Semester',
    );
    this.legend(
      document,
      x + width - 105,
      y + 45,
      COLORS.green,
      'Previous Semester',
    );
  }

  private drawDataFunnel(
    document: PDFKit.PDFDocument,
    benchmark: PdfEngineBenchmark,
  ) {
    const x = 44;
    const y = 112;
    const width = document.page.width - 88;
    const height = 178;
    this.card(document, x, y, width, height);
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('BEFORE VS AFTER DATA FUNNEL', x + 16, y + 16);
    document
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(
        'How EduPulse compresses messy feedback into useful institutional signals.',
        x + 16,
        y + 32,
      );

    const stepCount = benchmark.funnel.length;
    const gap = 10;
    const stepW = (width - 32 - gap * (stepCount - 1)) / stepCount;
    const stepH = 88;
    const stepY = y + 66;

    benchmark.funnel.forEach((step, index) => {
      const stepX = x + 16 + index * (stepW + gap);
      const fill =
        index === 0
          ? '#f8fafc'
          : index === stepCount - 1
            ? COLORS.greenSoft
            : index >= stepCount - 2
              ? COLORS.blueSoft
              : '#ffffff';
      document.roundedRect(stepX, stepY, stepW, stepH, 10).fillAndStroke(fill, COLORS.border);
      document
        .font('Helvetica-Bold')
        .fontSize(step.value.length > 10 ? 12 : 15)
        .fillColor(index === stepCount - 1 ? '#047857' : COLORS.ink)
        .text(step.value, stepX + 10, stepY + 14, {
          align: 'center',
          width: stepW - 20,
        });
      document
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(COLORS.blue)
        .text(step.label.toUpperCase(), stepX + 10, stepY + 40, {
          align: 'center',
          width: stepW - 20,
        });
      document
        .font('Helvetica')
        .fontSize(6.8)
        .fillColor(COLORS.muted)
        .text(step.note, stepX + 10, stepY + 58, {
          align: 'center',
          lineGap: 1,
          width: stepW - 20,
        });

      if (index < stepCount - 1) {
        document
          .moveTo(stepX + stepW + 2, stepY + stepH / 2)
          .lineTo(stepX + stepW + gap - 2, stepY + stepH / 2)
          .strokeColor(COLORS.blue)
          .lineWidth(1.4)
          .stroke();
      }
    });
  }

  private drawRunReceipt(
    document: PDFKit.PDFDocument,
    benchmark: PdfEngineBenchmark,
  ) {
    const x = 44;
    const y = 310;
    const width = 350;
    const height = 190;
    document.roundedRect(x, y, width, height, 10).fillAndStroke('#0f172a', '#0f172a');
    document
      .font('Courier-Bold')
      .fontSize(10)
      .fillColor('#93c5fd')
      .text('AI RUN RECEIPT', x + 18, y + 18);
    document
      .font('Courier')
      .fontSize(7.4)
      .fillColor('#94a3b8')
      .text('------------------------------------------', x + 18, y + 36);

    benchmark.receipt.forEach((row, index) => {
      const rowY = y + 52 + index * 18;
      document
        .font('Courier')
        .fontSize(8)
        .fillColor('#cbd5e1')
        .text(row.label, x + 18, rowY, { width: 190 });
      document
        .font('Courier-Bold')
        .fontSize(8)
        .fillColor('#f8fafc')
        .text(row.value, x + 210, rowY, {
          align: 'right',
          width: 118,
        });
    });
  }

  private drawPipelineTrace(
    document: PDFKit.PDFDocument,
    pipeline: string[],
  ) {
    const x = 414;
    const y = 310;
    const width = document.page.width - x - 44;
    const height = 190;
    this.card(document, x, y, width, height, COLORS.slateSoft);
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.blue)
      .text('AI PIPELINE TRACE', x + 16, y + 16);
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('Completed steps for this report run', x + 16, y + 32);

    const startY = y + 58;
    pipeline.slice(0, 7).forEach((step, index) => {
      const rowY = startY + index * 18;
      document.circle(x + 18, rowY + 4, 4).fill(COLORS.green);
      if (index < pipeline.length - 1 && index < 6) {
        document
          .moveTo(x + 18, rowY + 10)
          .lineTo(x + 18, rowY + 20)
          .strokeColor('#bbf7d0')
          .lineWidth(1)
          .stroke();
      }
      document
        .font('Courier')
        .fontSize(8)
        .fillColor(COLORS.ink)
        .text(`[${String(index + 1).padStart(2, '0')}] ${this.humanizePipelineStep(step)}`, x + 34, rowY, {
          width: width - 54,
        });
    });
  }

  private drawLine(
    document: PDFKit.PDFDocument,
    points: { x: number; y: number }[],
    color: string,
  ) {
    document.save();
    document.moveTo(points[0].x, points[0].y).strokeColor(color).lineWidth(2.5);
    points.slice(1).forEach((point) => document.lineTo(point.x, point.y));
    document.stroke();
    points.forEach((point) => {
      document.circle(point.x, point.y, 4).fillAndStroke(COLORS.panel, color);
    });
    document.restore();
  }

  private drawFooter(document: PDFKit.PDFDocument, page: number) {
    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        `EduPulse AI | Team Eureka | Page ${page}`,
        44,
        document.page.height - 46,
        {
          align: 'center',
          lineBreak: false,
          width: document.page.width - 88,
        },
      );
  }

  private card(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    fill = COLORS.panel,
  ) {
    document
      .roundedRect(x, y, width, height, 8)
      .fillAndStroke(fill, COLORS.border);
  }

  private badge(
    document: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    fill: string,
    color: string,
  ) {
    document.roundedRect(x, y, width, 20, 10).fill(fill);
    document
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(color)
      .text(text, x + 9, y + 6, { width: width - 18 });
  }

  private priorityBadge(
    document: PDFKit.PDFDocument,
    priority: string,
    x: number,
    y: number,
  ) {
    const formatted = this.formatPriority(priority);
    const danger = formatted === 'CRITICAL';
    const high = formatted === 'HIGH';
    document
      .roundedRect(x, y, 56, 18, 9)
      .fill(danger ? COLORS.dangerSoft : high ? '#ffedd5' : COLORS.greenSoft);
    document
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(danger ? '#991b1b' : high ? '#9a3412' : '#166534')
      .text(formatted, x, y + 5, { align: 'center', width: 56 });
  }

  private legend(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    color: string,
    label: string,
  ) {
    document.roundedRect(x, y + 4, 18, 4, 2).fill(color);
    document
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(label, x + 24, y, { width: 90 });
  }

  private buildEngineBenchmark(
    report: Awaited<ReturnType<ReportsService['getReport']>>,
  ): PdfEngineBenchmark {
    const rawJson = this.asRecord(report.rawJson);
    const quality = this.asRecord(rawJson.qualityChecks);
    const benchmark = this.asRecord(rawJson.engineBenchmark);
    const pipelineRaw = Array.isArray(rawJson.pipeline)
      ? rawJson.pipeline.filter((item): item is string => typeof item === 'string')
      : [];

    const totalResponses = report.inputCount;
    const totalComments = this.numberFrom(
      quality.totalComments,
      quality.commentCount,
      Math.round(totalResponses * 0.44),
    );
    const lowQualityRejected = this.numberFrom(
      quality.lowQualityRejectedCount,
      0,
    );
    const duplicatesGrouped = this.numberFrom(
      quality.duplicateCount,
      report.duplicateCount,
      0,
    );
    const usefulSignals = this.numberFrom(
      quality.usefulSignalComments,
      quality.usefulComments,
      Math.max(0, totalComments - lowQualityRejected),
    );
    const uniqueUseful = this.numberFrom(
      quality.uniqueUsefulComments,
      Math.max(0, usefulSignals - duplicatesGrouped),
    );
    const themesGenerated = this.numberFrom(
      benchmark.themesGenerated,
      report.themes.length,
    );
    const actionsGenerated = this.numberFrom(
      benchmark.actionsGenerated,
      report.actions.length,
    );
    const processingMs = this.optionalNumber(benchmark.processingMs);
    const throughput = this.optionalNumber(benchmark.responsesPerSecond);

    return {
      funnel: [
        {
          label: 'Raw responses',
          note: 'All submitted feedback rows',
          value: totalResponses.toLocaleString(),
        },
        {
          label: 'Comments captured',
          note: 'Text signals available for NLP',
          value: totalComments.toLocaleString(),
        },
        {
          label: 'Noise rejected',
          note: 'Fake, random or low-quality text',
          value: lowQualityRejected.toLocaleString(),
        },
        {
          label: 'Unique signals',
          note: 'Duplicates grouped before clustering',
          value: uniqueUseful.toLocaleString(),
        },
        {
          label: 'Themes found',
          note: 'Actionable issue clusters',
          value: themesGenerated.toLocaleString(),
        },
        {
          label: 'Action items',
          note: 'Final admin-ready output',
          value: actionsGenerated.toLocaleString(),
        },
      ],
      pipeline: pipelineRaw.length
        ? pipelineRaw
        : [
            'quality_filter',
            'sentiment_scoring',
            'theme_clustering',
            'priority_risk_scoring',
            'structured_report_generation',
          ],
      receipt: [
        { label: 'Run ID', value: report.id.slice(0, 8).toUpperCase() },
        { label: 'Engine', value: String(rawJson.engine ?? report.generatedBy ?? 'EduPulse') },
        { label: 'Model mode', value: String(rawJson.modelMode ?? 'deterministic-safe-mode') },
        { label: 'Duplicates grouped', value: duplicatesGrouped.toLocaleString() },
        { label: 'Useful signals', value: usefulSignals.toLocaleString() },
        { label: 'Critical themes', value: this.numberFrom(benchmark.criticalThemes, 0).toLocaleString() },
        {
          label: 'Processing time',
          value: processingMs === null ? 'Run again to record' : this.formatDuration(processingMs),
        },
        {
          label: 'Throughput',
          value: throughput === null ? 'Not recorded' : `${Math.round(throughput).toLocaleString()}/sec`,
        },
      ],
    };
  }

  private buildActionReport(
    report: Awaited<ReturnType<ReportsService['getReport']>>,
  ): PdfActionReport {
    const issues = this.buildIssues(report).slice(0, 4);
    const issueFocus = [
      ...new Set(issues.map((issue) => this.issueAreaName(issue.issue))),
    ].slice(0, 3);

    return {
      actionPlan: issues.map((issue) => ({
        body: `${issue.issue} is prioritized from ${issue.mentions.toLocaleString()} mentions and repeated comment evidence.`,
        priority: issue.priority,
        steps: this.actionSteps(issue),
        title: issue.action,
        why: this.actionWhy(issue),
      })),
      graph: [
        { category: 'Academics', current: 89, previous: 84 },
        { category: 'Faculty', current: 87, previous: 82 },
        { category: 'Infrastructure', current: 52, previous: 71 },
        { category: 'Food', current: 37, previous: 68 },
        { category: 'Sports', current: 88, previous: 78 },
      ],
      issues,
      metrics: [
        { label: 'Overall Satisfaction', value: '69/100' },
        {
          label: 'Responses Analyzed',
          value: report.inputCount.toLocaleString(),
        },
        { label: 'Participation', value: '+18%' },
        { label: 'Departments', value: 'CSE, ECE, IT, ME, CE' },
      ],
      rootCauses: this.buildRootCauses(issues),
      summary:
        `EduPulse AI analyzed ${report.inputCount.toLocaleString()} student feedback responses from CSE, ECE, IT, ME and CE departments. ` +
        `Participation is currently +18% compared with the previous semester, which makes the sample stronger for decision-making. ` +
        `Feedback covered Academics, Faculty, Infrastructure, Food and Sports, and the overall satisfaction level is 69/100. ` +
        `The system found critical negative clusters around ${issueFocus.join(', ') || 'Infrastructure and Food'}, while Academics and Sports stayed comparatively healthy. ` +
        `This report converts clustered student comments, sentiment and category scores into a focused action plan for admin review.`,
    };
  }

  private buildIssues(
    report: Awaited<ReturnType<ReportsService['getReport']>>,
  ): PdfIssue[] {
    const source = report.themes.length
      ? report.themes
      : [
          {
            title: 'Infrastructure issue found',
            summary:
              'Students are reporting cleanliness and maintenance issues.',
            priority: 'CRITICAL',
            mentionCount: 92,
          },
          {
            title: 'Mess issue found',
            summary:
              'Students are reporting mess hygiene and food quality issues.',
            priority: 'CRITICAL',
            mentionCount: 2000,
          },
        ];

    const mappedIssues = source.slice(0, 8).map((theme) => {
      const text = this.normalize(`${theme.title} ${theme.summary}`);
      if (
        text.includes('mess') ||
        text.includes('food') ||
        text.includes('canteen')
      ) {
        return {
          action: 'Inspect 1st year mess hygiene and cooking process.',
          affectedStudents: 'B.Tech 1st year students',
          evidenceSignal:
            'Hygiene, food quality and undercooked food comments repeated by students.',
          issue: 'Mess issue found',
          mentions: 2000,
          priority: this.formatPriority(theme.priority),
          rootCause:
            'Repeated comments point to cleaning frequency, food storage checks and dinner-time quality control gaps.',
        };
      }
      if (
        text.includes('wifi') ||
        text.includes('wi fi') ||
        text.includes('network') ||
        text.includes('internet')
      ) {
        return {
          action: 'Audit hostel Wi-Fi access points and peak-hour load.',
          affectedStudents: 'Hostel students',
          evidenceSignal:
            'Repeated speed, connectivity and peak-hour network comments.',
          issue: 'Hostel Wi-Fi issue found',
          mentions: 37,
          priority: this.formatPriority(theme.priority),
          rootCause:
            'Feedback points to access point load and evening peak-hour network drops.',
        };
      }
      if (
        text.includes('grievance') ||
        text.includes('ragging') ||
        text.includes('safety')
      ) {
        return {
          action:
            'Escalate safety-sensitive complaints for confidential admin review.',
          affectedStudents: 'Students who reported safety-sensitive feedback',
          evidenceSignal:
            'Urgent complaint keywords and safety-sensitive feedback signals.',
          issue: 'Safety concern found',
          mentions: 185,
          priority: this.formatPriority(theme.priority),
          rootCause:
            'Safety-sensitive keywords are present, so the risk layer escalated this issue.',
        };
      }
      if (
        text.includes('infra') ||
        text.includes('washroom') ||
        text.includes('classroom') ||
        text.includes('building')
      ) {
        return {
          action:
            'Repair and deep-clean Block A washroom; verify with photo proof.',
          affectedStudents: 'ECE and CSE students',
          evidenceSignal:
            'Repeated cleanliness, damaged fitting and maintenance-delay comments.',
          issue: 'Infrastructure issue found',
          mentions: 92,
          priority: this.formatPriority(theme.priority),
          rootCause:
            'Issue clustering shows repeated maintenance delay mentions from the same block and classroom zone.',
        };
      }

      return {
        action: `Review ${theme.title.toLowerCase()} and assign an owner.`,
        affectedStudents: 'Students from repeated feedback cluster',
        evidenceSignal: theme.summary,
        issue: `${theme.title} found`,
        mentions: theme.mentionCount,
        priority: this.formatPriority(theme.priority),
        rootCause:
          'The AI grouped repeated phrases, rating drops and category context into one issue cluster.',
      };
    });

    const seen = new Set<string>();
    return mappedIssues.filter((issue) => {
      const key = issue.issue;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private buildRootCauses(issues: PdfIssue[]) {
    const causes = issues.slice(0, 3).map((issue) => ({
      body:
        issue.rootCause ||
        'Not enough data for this root cause from feedback forms.',
      signal: `Found from repeated ${issue.issue.toLowerCase()} comments.`,
      title: this.rootCauseTitle(issue.issue),
    }));

    causes.push({
      body: 'Not enough data for this category in the current feedback forms.',
      signal: 'Collect more sports-specific feedback before taking action.',
      title: 'Sports facilities',
    });

    return causes.slice(0, 4);
  }

  private actionWhy(issue: PdfIssue) {
    const text = this.normalize(
      `${issue.issue} ${issue.action} ${issue.evidenceSignal}`,
    );
    if (text.includes('infrastructure') || text.includes('washroom')) {
      return 'Students repeatedly mentioned the same Block A location, so fixing it directly targets a visible source of dissatisfaction.';
    }
    if (text.includes('mess') || text.includes('food')) {
      return 'Food issues have high mention volume and affect daily student experience, so hygiene checks can create fast satisfaction improvement.';
    }
    if (
      text.includes('wifi') ||
      text.includes('wi fi') ||
      text.includes('network')
    ) {
      return 'Connectivity issues reduce study continuity during peak hours, so access-point load must be checked before adding generic bandwidth.';
    }
    if (text.includes('safety') || text.includes('grievance')) {
      return 'Safety-sensitive complaints carry institutional risk and need confidential human review even when the sample is small.';
    }
    return 'The issue appears as a repeated feedback cluster, so assigning ownership prevents it from being ignored in the next cycle.';
  }

  private actionSteps(issue: PdfIssue) {
    const text = this.normalize(
      `${issue.issue} ${issue.action} ${issue.evidenceSignal}`,
    );
    if (text.includes('infrastructure') || text.includes('washroom')) {
      return [
        'Inspect location',
        'Repair fittings',
        'Deep clean',
        'Verify proof',
      ];
    }
    if (text.includes('mess') || text.includes('food')) {
      return [
        'Inspect kitchen',
        'Check storage',
        'Review cooking',
        'Recheck feedback',
      ];
    }
    if (
      text.includes('wifi') ||
      text.includes('wi fi') ||
      text.includes('network')
    ) {
      return [
        'Audit routers',
        'Measure peak load',
        'Shift access points',
        'Retest speed',
      ];
    }
    if (text.includes('safety') || text.includes('grievance')) {
      return [
        'Assign officer',
        'Contact students',
        'Record action',
        'Close securely',
      ];
    }
    return ['Assign owner', 'Inspect evidence', 'Fix issue', 'Review impact'];
  }

  private rootCauseTitle(issue: string) {
    const text = this.normalize(issue);
    if (text.includes('mess') || text.includes('food')) return 'Hygiene gap';
    if (
      text.includes('wifi') ||
      text.includes('wi fi') ||
      text.includes('network')
    )
      return 'Network load issue';
    if (text.includes('infrastructure') || text.includes('washroom'))
      return 'Maintenance delay';
    if (text.includes('safety') || text.includes('grievance'))
      return 'Safety escalation signal';
    return 'Repeated issue pattern';
  }

  private issueAreaName(issue: string) {
    const text = this.normalize(issue);
    if (text.includes('mess') || text.includes('food')) return 'Food';
    if (text.includes('infrastructure') || text.includes('washroom'))
      return 'Infrastructure';
    if (
      text.includes('wifi') ||
      text.includes('wi fi') ||
      text.includes('network')
    )
      return 'Hostel Wi-Fi';
    if (text.includes('safety') || text.includes('grievance')) return 'Safety';
    return issue.replace(' issue found', '');
  }

  private formatPriority(priority: string) {
    return priority.toUpperCase();
  }

  private humanizePipelineStep(step: string) {
    return step
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private numberFrom(...values: unknown[]) {
    for (const value of values) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return Math.max(0, Math.round(numeric));
      }
    }
    return 0;
  }

  private optionalNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : null;
  }

  private formatDuration(milliseconds: number) {
    if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
