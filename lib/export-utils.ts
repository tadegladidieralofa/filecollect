import { Campaign, CampaignFileRequirement, Submission, Organization } from '@/lib/types';
import { format } from 'date-fns';

export async function exportToExcel(
  campaign: Campaign,
  requirements: CampaignFileRequirement[],
  submissions: Submission[],
  organizations: Organization[]
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['Campaign Report'],
    [''],
    ['Campaign Name', campaign.name],
    ['Description', campaign.description],
    ['Deadline', format(new Date(campaign.deadline), 'yyyy-MM-dd HH:mm')],
    ['Status', campaign.status],
    [''],
    ['Statistics'],
    ['Total Submissions', submissions.length],
    ['Approved', submissions.filter(s => s.status === 'approved').length],
    ['Pending', submissions.filter(s => s.status === 'pending').length],
    ['Rejected', submissions.filter(s => s.status === 'rejected').length],
    ['Total Organizations', organizations.length],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  const subData = submissions.map(sub => ({
    'File Name': sub.file_name,
    'Requirement': (sub as any).campaign_file_requirements?.name || '',
    'Organization': (sub as any).organizations?.name || 'Anonymous',
    'Submitted By': sub.submitted_by_name,
    'Email': sub.submitted_by_email,
    'Status': sub.status,
    'Rejection Reason': sub.rejection_reason || '',
    'Submitted At': format(new Date(sub.created_at), 'yyyy-MM-dd HH:mm'),
  }));
  const ws2 = XLSX.utils.json_to_sheet(subData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Submissions');

  const orgData = organizations.map(org => {
    const orgSubs = submissions.filter(s => s.organization_id === org.id);
    const row: Record<string, string | number> = {
      'Organization': org.name,
      'Contact Person': org.contact_person,
      'Email': org.contact_email,
      'Total Files': orgSubs.length,
      'Approved': orgSubs.filter(s => s.status === 'approved').length,
      'Pending': orgSubs.filter(s => s.status === 'pending').length,
      'Rejected': orgSubs.filter(s => s.status === 'rejected').length,
    };
    requirements.forEach(req => {
      const reqSub = orgSubs.find(s => s.file_requirement_id === req.id);
      row[req.name] = reqSub ? reqSub.status : 'Not submitted';
    });
    return row;
  });
  const ws3 = XLSX.utils.json_to_sheet(orgData);
  XLSX.utils.book_append_sheet(wb, ws3, 'By Organization');

  const typeData = requirements.map(req => {
    const reqSubs = submissions.filter(s => s.file_requirement_id === req.id);
    return {
      'Requirement': req.name,
      'Formats': req.accepted_formats.join(', ').toUpperCase(),
      'Max Size (MB)': req.max_size_mb,
      'Required': req.is_required ? 'Yes' : 'No',
      'Total Submissions': reqSubs.length,
      'Approved': reqSubs.filter(s => s.status === 'approved').length,
      'Pending': reqSubs.filter(s => s.status === 'pending').length,
      'Rejected': reqSubs.filter(s => s.status === 'rejected').length,
    };
  });
  const ws4 = XLSX.utils.json_to_sheet(typeData);
  XLSX.utils.book_append_sheet(wb, ws4, 'By File Type');

  XLSX.writeFile(wb, `${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.xlsx`);
}

export function exportToPdf(
  campaign: Campaign,
  requirements: CampaignFileRequirement[],
  submissions: Submission[],
  organizations: Organization[]
) {
  const approved = submissions.filter(s => s.status === 'approved').length;
  const pending = submissions.filter(s => s.status === 'pending').length;
  const rejected = submissions.filter(s => s.status === 'rejected').length;

  const orgRows = organizations.map(org => {
    const orgSubs = submissions.filter(s => s.organization_id === org.id);
    return `<tr>
      <td class="border px-3 py-2">${org.name}</td>
      <td class="border px-3 py-2">${orgSubs.length}</td>
      <td class="border px-3 py-2">${orgSubs.filter(s => s.status === 'approved').length}</td>
      ${requirements.map(req => {
        const sub = orgSubs.find(s => s.file_requirement_id === req.id);
        const status = sub ? sub.status : '-';
        const color = status === 'approved' ? '#16a34a' : status === 'rejected' ? '#dc2626' : status === 'pending' ? '#ca8a04' : '#94a3b8';
        return `<td class="border px-3 py-2" style="color:${color};font-weight:600">${status}</td>`;
      }).join('')}
    </tr>`;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h2 { font-size: 18px; margin-top: 24px; color: #2563eb; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
        .stats { display: flex; gap: 24px; margin-bottom: 24px; }
        .stat { text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f1f5f9; text-align: left; font-weight: 600; }
        td, th { border: 1px solid #e2e8f0; padding: 8px 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-approved { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef9c3; color: #854d0e; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${campaign.name}</h1>
      <p class="meta">${campaign.description}</p>
      <p class="meta">Deadline: ${format(new Date(campaign.deadline), 'MMMM d, yyyy HH:mm')} | Status: ${campaign.status.toUpperCase()}</p>

      <div class="stats">
        <div class="stat"><div class="stat-value">${submissions.length}</div><div class="stat-label">Total</div></div>
        <div class="stat"><div class="stat-value" style="color:#16a34a">${approved}</div><div class="stat-label">Approved</div></div>
        <div class="stat"><div class="stat-value" style="color:#ca8a04">${pending}</div><div class="stat-label">Pending</div></div>
        <div class="stat"><div class="stat-value" style="color:#dc2626">${rejected}</div><div class="stat-label">Rejected</div></div>
      </div>

      <h2>Organization Progress</h2>
      <table>
        <thead><tr><th>Organization</th><th>Files</th><th>Approved</th>${requirements.map(r => `<th>${r.name}</th>`).join('')}</tr></thead>
        <tbody>${orgRows}</tbody>
      </table>

      <h2>File Requirements</h2>
      <table>
        <thead><tr><th>Requirement</th><th>Formats</th><th>Max Size</th><th>Required</th><th>Submitted</th></tr></thead>
        <tbody>
          ${requirements.map(req => {
            const reqSubs = submissions.filter(s => s.file_requirement_id === req.id);
            return `<tr><td>${req.name}</td><td>${req.accepted_formats.join(', ').toUpperCase()}</td><td>${req.max_size_mb} MB</td><td>${req.is_required ? 'Yes' : 'No'}</td><td>${reqSubs.length} / ${organizations.length}</td></tr>`;
          }).join('')}
        </tbody>
      </table>

      <h2>All Submissions</h2>
      <table>
        <thead><tr><th>File</th><th>Requirement</th><th>Organization</th><th>Submitted By</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          ${submissions.map(sub => {
            const sc = sub.status === 'approved' ? 'badge-approved' : sub.status === 'rejected' ? 'badge-rejected' : 'badge-pending';
            return `<tr><td>${sub.file_name}</td><td>${(sub as any).campaign_file_requirements?.name || ''}</td><td>${(sub as any).organizations?.name || 'Anonymous'}</td><td>${sub.submitted_by_name}</td><td>${format(new Date(sub.created_at), 'MMM d, HH:mm')}</td><td><span class="badge ${sc}">${sub.status}</span></td></tr>`;
          }).join('')}
        </tbody>
      </table>

      <p style="margin-top:24px;font-size:11px;color:#94a3b8;">Generated by FileCollect on ${format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  }
}
