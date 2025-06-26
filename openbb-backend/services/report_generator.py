"""
Report generation service for OpenBB Copilot
Generates PDF and Excel reports from financial analysis
"""

import os
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import base64
from io import BytesIO

# For PDF generation
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.lineplots import LinePlot
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

# For Excel generation
try:
    import xlsxwriter
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False

# For chart generation
try:
    import matplotlib.pyplot as plt
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    CHARTS_AVAILABLE = True
except ImportError:
    CHARTS_AVAILABLE = False


class ReportGenerator:
    """Generate professional financial reports"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet() if PDF_AVAILABLE else None
        if PDF_AVAILABLE:
            # Custom styles
            self.styles.add(ParagraphStyle(
                name='CustomTitle',
                parent=self.styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#2E86AB'),
                spaceAfter=30,
                alignment=TA_CENTER
            ))
            self.styles.add(ParagraphStyle(
                name='SectionTitle',
                parent=self.styles['Heading2'],
                fontSize=16,
                textColor=colors.HexColor('#2E86AB'),
                spaceAfter=12
            ))
    
    def generate_pdf_report(
        self,
        analysis_data: Dict[str, Any],
        filename: str = None
    ) -> Optional[str]:
        """Generate PDF report from analysis data"""
        if not PDF_AVAILABLE:
            return None
            
        if not filename:
            filename = f"financial_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            
        try:
            # Create document
            doc = SimpleDocTemplate(filename, pagesize=letter)
            story = []
            
            # Title page
            story.append(Paragraph(
                f"Financial Analysis Report",
                self.styles['CustomTitle']
            ))
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph(
                f"Generated on {datetime.now().strftime('%B %d, %Y')}",
                self.styles['Normal']
            ))
            story.append(PageBreak())
            
            # Executive Summary
            if 'summary' in analysis_data:
                story.append(Paragraph("Executive Summary", self.styles['SectionTitle']))
                story.append(Paragraph(analysis_data['summary'], self.styles['Normal']))
                story.append(Spacer(1, 0.3*inch))
            
            # Company Overview
            if 'company_info' in analysis_data:
                story.append(Paragraph("Company Overview", self.styles['SectionTitle']))
                self._add_company_info(story, analysis_data['company_info'])
                story.append(Spacer(1, 0.3*inch))
            
            # Financial Metrics
            if 'financial_metrics' in analysis_data:
                story.append(Paragraph("Key Financial Metrics", self.styles['SectionTitle']))
                self._add_financial_table(story, analysis_data['financial_metrics'])
                story.append(Spacer(1, 0.3*inch))
            
            # Valuation Analysis
            if 'valuation' in analysis_data:
                story.append(Paragraph("Valuation Analysis", self.styles['SectionTitle']))
                self._add_valuation_analysis(story, analysis_data['valuation'])
                story.append(PageBreak())
            
            # Risk Analysis
            if 'risk_analysis' in analysis_data:
                story.append(Paragraph("Risk Analysis", self.styles['SectionTitle']))
                self._add_risk_analysis(story, analysis_data['risk_analysis'])
                story.append(Spacer(1, 0.3*inch))
            
            # Charts
            if CHARTS_AVAILABLE and 'charts' in analysis_data:
                story.append(Paragraph("Financial Charts", self.styles['SectionTitle']))
                self._add_charts(story, analysis_data['charts'])
            
            # Build PDF
            doc.build(story)
            return filename
            
        except Exception as e:
            print(f"Error generating PDF: {str(e)}")
            return None
    
    def _add_company_info(self, story: List, info: Dict):
        """Add company information to report"""
        data = [
            ['Company', info.get('name', 'N/A')],
            ['Ticker', info.get('ticker', 'N/A')],
            ['Sector', info.get('sector', 'N/A')],
            ['Industry', info.get('industry', 'N/A')],
            ['Market Cap', f"${info.get('market_cap', 0):,.0f}" if info.get('market_cap') else 'N/A'],
            ['Employees', f"{info.get('employees', 0):,}" if info.get('employees') else 'N/A']
        ]
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        story.append(table)
    
    def _add_financial_table(self, story: List, metrics: Dict):
        """Add financial metrics table"""
        # Prepare data
        headers = ['Metric', 'Current', 'Previous', 'Change %']
        data = [headers]
        
        for metric, values in metrics.items():
            if isinstance(values, dict) and 'current' in values:
                current = values.get('current', 0)
                previous = values.get('previous', 0)
                change = ((current - previous) / previous * 100) if previous else 0
                
                data.append([
                    metric.replace('_', ' ').title(),
                    f"${current:,.0f}" if current > 1000 else f"{current:.2f}",
                    f"${previous:,.0f}" if previous > 1000 else f"{previous:.2f}",
                    f"{change:+.1f}%"
                ])
        
        table = Table(data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(table)
    
    def _add_valuation_analysis(self, story: List, valuation: Dict):
        """Add valuation analysis section"""
        if 'dcf' in valuation:
            dcf = valuation['dcf']
            story.append(Paragraph("DCF Valuation", self.styles['Heading3']))
            story.append(Paragraph(
                f"Enterprise Value: ${dcf.get('enterprise_value', 0):,.0f}",
                self.styles['Normal']
            ))
            story.append(Paragraph(
                f"Fair Value per Share: ${dcf.get('price_per_share', 0):.2f}",
                self.styles['Normal']
            ))
            story.append(Spacer(1, 0.2*inch))
        
        if 'multiples' in valuation:
            story.append(Paragraph("Relative Valuation", self.styles['Heading3']))
            multiples_data = [['Multiple', 'Company', 'Peer Average', 'Premium/Discount']]
            
            for multiple, data in valuation['multiples'].items():
                multiples_data.append([
                    multiple.upper(),
                    f"{data.get('company', 0):.2f}",
                    f"{data.get('peer_mean', 0):.2f}",
                    f"{data.get('premium_discount', 0):+.1f}%"
                ])
            
            table = Table(multiples_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(table)
    
    def _add_risk_analysis(self, story: List, risk_data: Dict):
        """Add risk analysis section"""
        if 'altman_z' in risk_data:
            z_score = risk_data['altman_z']
            story.append(Paragraph("Altman Z-Score Analysis", self.styles['Heading3']))
            story.append(Paragraph(
                f"Z-Score: {z_score.get('z_score', 0):.2f} - {z_score.get('zone', 'Unknown')}",
                self.styles['Normal']
            ))
            story.append(Paragraph(
                f"Risk Assessment: {z_score.get('risk_assessment', 'Unknown')}",
                self.styles['Normal']
            ))
            story.append(Spacer(1, 0.2*inch))
        
        if 'monte_carlo' in risk_data:
            mc = risk_data['monte_carlo']
            story.append(Paragraph("Monte Carlo Risk Analysis", self.styles['Heading3']))
            story.append(Paragraph(
                f"95% Value at Risk: ${mc.get('var_95', 0):,.2f}",
                self.styles['Normal']
            ))
            story.append(Paragraph(
                f"Expected Price (1Y): ${mc.get('expected_price', 0):.2f}",
                self.styles['Normal']
            ))
    
    def _add_charts(self, story: List, charts_data: Dict):
        """Add charts to the report"""
        if not CHARTS_AVAILABLE:
            return
            
        for chart_name, chart_info in charts_data.items():
            if chart_info.get('type') == 'line':
                img_buffer = self._create_line_chart(
                    chart_info.get('data', {}),
                    chart_info.get('title', chart_name)
                )
            elif chart_info.get('type') == 'bar':
                img_buffer = self._create_bar_chart(
                    chart_info.get('data', {}),
                    chart_info.get('title', chart_name)
                )
            else:
                continue
                
            if img_buffer:
                img = Image(img_buffer, width=6*inch, height=4*inch)
                story.append(img)
                story.append(Spacer(1, 0.3*inch))
    
    def _create_line_chart(self, data: Dict, title: str) -> Optional[BytesIO]:
        """Create a line chart"""
        try:
            plt.figure(figsize=(10, 6))
            
            for series_name, values in data.items():
                if isinstance(values, list):
                    plt.plot(values, label=series_name)
            
            plt.title(title)
            plt.legend()
            plt.grid(True, alpha=0.3)
            
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            plt.close()
            
            buffer.seek(0)
            return buffer
            
        except Exception:
            return None
    
    def _create_bar_chart(self, data: Dict, title: str) -> Optional[BytesIO]:
        """Create a bar chart"""
        try:
            plt.figure(figsize=(10, 6))
            
            categories = list(data.keys())
            values = [v if isinstance(v, (int, float)) else 0 for v in data.values()]
            
            plt.bar(categories, values)
            plt.title(title)
            plt.xticks(rotation=45, ha='right')
            plt.grid(True, alpha=0.3, axis='y')
            
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            plt.close()
            
            buffer.seek(0)
            return buffer
            
        except Exception:
            return None
    
    def generate_excel_report(
        self,
        analysis_data: Dict[str, Any],
        filename: str = None
    ) -> Optional[str]:
        """Generate Excel report from analysis data"""
        if not EXCEL_AVAILABLE:
            return None
            
        if not filename:
            filename = f"financial_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        try:
            # Create workbook
            workbook = xlsxwriter.Workbook(filename)
            
            # Formats
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#2E86AB',
                'font_color': 'white',
                'align': 'center',
                'valign': 'vcenter',
                'border': 1
            })
            
            title_format = workbook.add_format({
                'bold': True,
                'font_size': 16,
                'font_color': '#2E86AB'
            })
            
            number_format = workbook.add_format({
                'num_format': '#,##0',
                'border': 1
            })
            
            percent_format = workbook.add_format({
                'num_format': '0.0%',
                'border': 1
            })
            
            currency_format = workbook.add_format({
                'num_format': '$#,##0',
                'border': 1
            })
            
            # Summary sheet
            summary_sheet = workbook.add_worksheet('Summary')
            self._write_summary_sheet(summary_sheet, analysis_data, title_format, header_format)
            
            # Financial Metrics sheet
            if 'financial_metrics' in analysis_data:
                metrics_sheet = workbook.add_worksheet('Financial Metrics')
                self._write_metrics_sheet(
                    metrics_sheet,
                    analysis_data['financial_metrics'],
                    header_format,
                    number_format,
                    percent_format
                )
            
            # Valuation sheet
            if 'valuation' in analysis_data:
                valuation_sheet = workbook.add_worksheet('Valuation')
                self._write_valuation_sheet(
                    valuation_sheet,
                    analysis_data['valuation'],
                    header_format,
                    currency_format,
                    percent_format
                )
            
            # Risk Analysis sheet
            if 'risk_analysis' in analysis_data:
                risk_sheet = workbook.add_worksheet('Risk Analysis')
                self._write_risk_sheet(
                    risk_sheet,
                    analysis_data['risk_analysis'],
                    header_format,
                    number_format
                )
            
            # Raw Data sheets
            if 'raw_data' in analysis_data:
                for data_name, data_values in analysis_data['raw_data'].items():
                    if isinstance(data_values, (list, pd.DataFrame)):
                        sheet_name = data_name[:31]  # Excel sheet name limit
                        data_sheet = workbook.add_worksheet(sheet_name)
                        self._write_data_sheet(data_sheet, data_values, header_format)
            
            workbook.close()
            return filename
            
        except Exception as e:
            print(f"Error generating Excel: {str(e)}")
            return None
    
    def _write_summary_sheet(self, worksheet, data: Dict, title_format, header_format):
        """Write summary sheet"""
        row = 0
        
        # Title
        worksheet.write(row, 0, 'Financial Analysis Report', title_format)
        row += 2
        
        # Date
        worksheet.write(row, 0, 'Generated:', header_format)
        worksheet.write(row, 1, datetime.now().strftime('%B %d, %Y'))
        row += 2
        
        # Company info
        if 'company_info' in data:
            worksheet.write(row, 0, 'Company Information', header_format)
            row += 1
            
            for key, value in data['company_info'].items():
                worksheet.write(row, 0, key.replace('_', ' ').title())
                worksheet.write(row, 1, str(value))
                row += 1
            
            row += 1
        
        # Key insights
        if 'key_insights' in data:
            worksheet.write(row, 0, 'Key Insights', header_format)
            row += 1
            
            for i, insight in enumerate(data['key_insights'], 1):
                worksheet.write(row, 0, f"{i}. {insight}")
                row += 1
    
    def _write_metrics_sheet(self, worksheet, metrics: Dict, header_format, number_format, percent_format):
        """Write financial metrics sheet"""
        # Headers
        headers = ['Metric', 'Current', 'Previous', 'Change', 'Change %']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Data
        row = 1
        for metric, values in metrics.items():
            if isinstance(values, dict):
                current = values.get('current', 0)
                previous = values.get('previous', 0)
                change = current - previous
                change_pct = (change / previous) if previous else 0
                
                worksheet.write(row, 0, metric.replace('_', ' ').title())
                worksheet.write(row, 1, current, number_format)
                worksheet.write(row, 2, previous, number_format)
                worksheet.write(row, 3, change, number_format)
                worksheet.write(row, 4, change_pct, percent_format)
                
                row += 1
        
        # Auto-fit columns
        worksheet.set_column(0, 0, 25)
        worksheet.set_column(1, 4, 15)
    
    def _write_valuation_sheet(self, worksheet, valuation: Dict, header_format, currency_format, percent_format):
        """Write valuation analysis sheet"""
        row = 0
        
        # DCF Analysis
        if 'dcf' in valuation:
            worksheet.write(row, 0, 'DCF Valuation', header_format)
            row += 1
            
            dcf = valuation['dcf']
            worksheet.write(row, 0, 'Enterprise Value')
            worksheet.write(row, 1, dcf.get('enterprise_value', 0), currency_format)
            row += 1
            
            worksheet.write(row, 0, 'Fair Value per Share')
            worksheet.write(row, 1, dcf.get('price_per_share', 0), currency_format)
            row += 2
        
        # Multiples
        if 'multiples' in valuation:
            worksheet.write(row, 0, 'Relative Valuation', header_format)
            worksheet.write(row, 1, 'Company', header_format)
            worksheet.write(row, 2, 'Peer Avg', header_format)
            worksheet.write(row, 3, 'Premium/Discount', header_format)
            row += 1
            
            for multiple, data in valuation['multiples'].items():
                worksheet.write(row, 0, multiple.upper())
                worksheet.write(row, 1, data.get('company', 0))
                worksheet.write(row, 2, data.get('peer_mean', 0))
                worksheet.write(row, 3, data.get('premium_discount', 0) / 100, percent_format)
                row += 1
    
    def _write_risk_sheet(self, worksheet, risk_data: Dict, header_format, number_format):
        """Write risk analysis sheet"""
        row = 0
        
        # Altman Z-Score
        if 'altman_z' in risk_data:
            worksheet.write(row, 0, 'Altman Z-Score Analysis', header_format)
            row += 1
            
            z_data = risk_data['altman_z']
            worksheet.write(row, 0, 'Z-Score')
            worksheet.write(row, 1, z_data.get('z_score', 0))
            row += 1
            
            worksheet.write(row, 0, 'Zone')
            worksheet.write(row, 1, z_data.get('zone', 'Unknown'))
            row += 1
            
            worksheet.write(row, 0, 'Risk Assessment')
            worksheet.write(row, 1, z_data.get('risk_assessment', 'Unknown'))
            row += 2
        
        # Monte Carlo
        if 'monte_carlo' in risk_data:
            worksheet.write(row, 0, 'Monte Carlo Simulation', header_format)
            row += 1
            
            mc_data = risk_data['monte_carlo']
            worksheet.write(row, 0, 'Current Price')
            worksheet.write(row, 1, mc_data.get('current_price', 0), number_format)
            row += 1
            
            worksheet.write(row, 0, 'Expected Price (1Y)')
            worksheet.write(row, 1, mc_data.get('expected_price', 0), number_format)
            row += 1
            
            worksheet.write(row, 0, '95% VaR')
            worksheet.write(row, 1, mc_data.get('var_95', 0), number_format)
            row += 1
    
    def _write_data_sheet(self, worksheet, data, header_format):
        """Write raw data sheet"""
        if isinstance(data, pd.DataFrame):
            # Write headers
            for col, header in enumerate(data.columns):
                worksheet.write(0, col, str(header), header_format)
            
            # Write data
            for row_idx, row in data.iterrows():
                for col_idx, value in enumerate(row):
                    worksheet.write(row_idx + 1, col_idx, value)
        
        elif isinstance(data, list) and data:
            if isinstance(data[0], dict):
                # Write headers from first dict
                headers = list(data[0].keys())
                for col, header in enumerate(headers):
                    worksheet.write(0, col, str(header), header_format)
                
                # Write data
                for row_idx, row_data in enumerate(data):
                    for col_idx, header in enumerate(headers):
                        worksheet.write(row_idx + 1, col_idx, row_data.get(header, ''))
    
    def create_analysis_summary(
        self,
        session_data: Dict[str, Any],
        contexts: List[Any]
    ) -> Dict[str, Any]:
        """Create a comprehensive analysis summary for report generation"""
        summary = {
            'generated_at': datetime.now().isoformat(),
            'session_id': session_data.get('session_id'),
            'company_info': {},
            'financial_metrics': {},
            'valuation': {},
            'risk_analysis': {},
            'key_insights': [],
            'charts': {},
            'raw_data': {}
        }
        
        # Extract company information
        for context in contexts:
            if context.widget_type == 'company_profile':
                summary['company_info'] = {
                    'name': context.data.get('company_name'),
                    'ticker': context.ticker,
                    'sector': context.data.get('sector'),
                    'industry': context.data.get('industry'),
                    'market_cap': context.data.get('market_cap'),
                    'employees': context.data.get('employees')
                }
                break
        
        # Extract financial metrics
        for context in contexts:
            if context.widget_type in ['income_statement', 'balance_sheet', 'key_metrics']:
                widget_data = context.data
                if isinstance(widget_data, list) and len(widget_data) >= 2:
                    # Compare current vs previous period
                    current = widget_data[0]
                    previous = widget_data[1]
                    
                    for key in current:
                        if isinstance(current[key], (int, float)):
                            summary['financial_metrics'][key] = {
                                'current': current[key],
                                'previous': previous.get(key, 0)
                            }
        
        # Add raw data for detailed analysis
        for context in contexts:
            summary['raw_data'][f"{context.ticker}_{context.widget_type}"] = context.data
        
        return summary