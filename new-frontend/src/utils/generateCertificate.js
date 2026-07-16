import { jsPDF } from 'jspdf';
import { ARBITRUM_SEPOLIA } from '../config';

export async function downloadCertificate(txResult, walletAddress, backendApiUrl) {
  try {
    // 1. Fetch certificate ID from backend if available
    let certId = 'Pending';
    try {
      const res = await fetch(`${backendApiUrl}/api/v1/verify/certificate?hash=${txResult.sha256 || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.CertificateID) {
          certId = data.CertificateID;
        }
      }
    } catch (e) {
      console.warn('Could not fetch certificate ID from backend', e);
    }

    // 2. Initialize jsPDF (Landscape, A4)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;

    // --- Border ---
    doc.setDrawColor(32, 57, 133); // Dark Blue (#203985)
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // --- Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(32, 57, 133);
    doc.text('VeriTrace Registration Certificate', centerX, 40, { align: 'center' });

    // --- Subtitle ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('Certificate of Digital Provenance & Authenticity', centerX, 52, { align: 'center' });

    // --- Content Text ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    let y = 80;
    doc.text('This document certifies that the digital asset with SHA-256 hash:', centerX, y, { align: 'center' });
    y += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text(txResult.sha256 || 'Unknown', centerX, y, { align: 'center' });
    y += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.text('has been immutably registered on the blockchain by the creator address:', centerX, y, { align: 'center' });
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(walletAddress || 'Unknown', centerX, y, { align: 'center' });
    y += 20;

    // --- Dates and Meta ---
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Registration Date: ${dateStr}`, centerX, y, { align: 'center' });
    y += 10;

    if (certId !== 'Pending') {
      doc.text(`Certificate ID: ${certId}`, centerX, y, { align: 'center' });
      y += 15;
    } else {
      y += 5;
    }

    // --- Links ---
    doc.setTextColor(37, 99, 235); // Blue link color
    
    // Arbiscan
    const txUrl = `${ARBITRUM_SEPOLIA.explorer}/tx/${txResult.hash}`;
    doc.textWithLink('View Transaction on Arbiscan', centerX, y, { url: txUrl, align: 'center' });
    y += 10;

    // S3
    if (txResult.mediaS3Url) {
      doc.textWithLink('View Original Asset (S3 Storage)', centerX, y, { url: txResult.mediaS3Url, align: 'center' });
      y += 10;
    }

    // IPFS Media
    if (txResult.mediaIpfsUrl) {
      const ipfsLink = txResult.mediaIpfsUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      doc.textWithLink('View Immutable Content (IPFS)', centerX, y, { url: ipfsLink, align: 'center' });
      y += 10;
    }

    // IPFS Metadata
    if (txResult.ipfsCid) {
      const metaLink = `https://gateway.pinata.cloud/ipfs/${txResult.ipfsCid}`;
      doc.textWithLink('View Blockchain Metadata (IPFS JSON)', centerX, y, { url: metaLink, align: 'center' });
    }

    // --- Footer ---
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('VeriTrace Protocol - Secured by Arbitrum & IPFS', centerX, pageHeight - 15, { align: 'center' });

    // --- Download ---
    doc.save(`VeriTrace_Certificate_${txResult.sha256 ? txResult.sha256.slice(0,8) : 'asset'}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
  }
}
