import { showAlert } from '../stores/useDialogStore';

export const printTicket = (ticket: any, customer: any, vehicle: any, carsAhead: number = 0) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showAlert('Veuillez autoriser les fenêtres contextuelles (pop-ups) pour imprimer le ticket.', 'warning');
    return;
  }

  const currentDate = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Ticket de Lavage</title>
      <style>
        body {
          font-family: 'Courier New', Courier, monospace;
          color: #000;
          margin: 0;
          padding: 10px;
          width: 58mm; /* Standard small receipt width */
          margin-left: auto;
          margin-right: auto;
          font-size: 11px;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
        }
        .header h1 {
          font-size: 14px;
          margin: 0 0 4px 0;
        }
        .header p {
          margin: 0;
          font-size: 11px;
        }
        .section {
          margin-bottom: 10px;
        }
        .section-title {
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 4px;
          font-size: 11px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 11px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          border-top: 1px dashed #000;
          padding-top: 8px;
          font-size: 10px;
        }
        @media print {
          body { width: 100%; margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="header">
        <h1>Lavage & Vidange VIDA</h1>
        <p>Le Lavage Automobile par Excellence</p>
        <p>Date: ${currentDate}</p>
      </div>
      
      <div class="section">
        <div class="row">
          <span><strong>TICKET N°:</strong></span>
          <span><strong>${ticket.ticket_number || 'N/A'}</strong></span>
        </div>
        <div class="row">
          <span>Catégorie:</span>
          <span><strong>${ticket.requested_service ? ticket.requested_service.toUpperCase() : 'LAVAGE'}</strong></span>
        </div>
        <div class="row">
          <span>Statut:</span>
          <span>En file d'attente</span>
        </div>
        <div class="row">
          <span>Voitures avant vous:</span>
          <span><strong>${carsAhead}</strong></span>
        </div>
        <div class="row">
          <span>Client:</span>
          <span>${customer?.full_name || 'Client Passager'}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Véhicule</div>
        <div class="row">
          <span>Matricule:</span>
          <span>${vehicle?.plate_number || 'N/A'}</span>
        </div>
        <div class="row">
          <span>Modèle:</span>
          <span>${vehicle?.brand || 'N/A'} ${vehicle?.model || ''}</span>
        </div>
      </div>
      
      <div class="footer">
        <p>Merci de votre visite!</p>
        <p>Veuillez conserver ce ticket.</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
