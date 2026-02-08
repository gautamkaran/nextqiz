
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Player {
    nickname: string;
    score: number;
    answers: Answer[];
}

interface Answer {
    questionIndex: number;
    answerIndex: number;
    isCorrect: boolean;
    timeTaken: number;
}

interface Question {
    questionText: string;
    options: string[];
    correctAnswer: number;
    timeLimit: number;
}

interface GameData {
    quizTitle: string;
    date: string;
    pin: string;
    players: Player[];
    quizQuestions: Question[];
}

// Watermark function to add NextQiz branding with logo
const addWatermark = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Footer with branding
    const footerY = pageHeight - 10;

    // Draw logo icon (simple representation)
    // Brand color box with checkmark/lightning bolt shape
    doc.setFillColor(57, 243, 166); // NextQiz brand color (emerald)
    doc.roundedRect(12, footerY - 5, 6, 6, 1, 1, 'F'); // Small rounded square

    // Add a simple "N" or checkmark inside
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('✓', 15, footerY - 0.5, { align: 'center' });

    // Left side: NextQiz branding text
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NextQiz', 21, footerY);

    // Center: Tagline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Powered by NextQiz - Interactive Quiz Platform', pageWidth / 2, footerY, { align: 'center' });

    // Right side: Page number
    doc.setFontSize(8);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 14, footerY, { align: 'right' });

    // Optional: Diagonal watermark in background
    doc.setFontSize(50);
    doc.setTextColor(245, 245, 245); // Very light gray
    doc.setFont('helvetica', 'bold');

    // Rotate and add diagonal watermark
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    doc.text('NextQiz', centerX, centerY, {
        align: 'center',
        angle: 45,
        renderingMode: 'fill',
        opacity: 0.05
    } as any);

    // Reset text color
    doc.setTextColor(0, 0, 0);
};

export const generatePDFReport = (gameData: GameData) => {
    const doc = new jsPDF();
    let currentPage = 1;

    // -- Header --
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('NextQiz Report', 14, 20);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Quiz: ${gameData.quizTitle}`, 14, 30);
    doc.text(`Date: ${new Date(gameData.date).toLocaleDateString()}`, 14, 38);
    doc.text(`Game PIN: ${gameData.pin}`, 14, 46);
    doc.text(`Total Players: ${gameData.players.length}`, 14, 54);

    // -- Leaderboard Table --
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Leaderboard', 14, 70);

    const sortedPlayers = [...gameData.players].sort((a, b) => b.score - a.score);

    const leaderboardData = sortedPlayers.map((p, i) => [
        i + 1,
        p.nickname,
        p.score,
        `${((p.answers.filter(a => a.isCorrect).length / gameData.quizQuestions.length) * 100).toFixed(0)}%`
    ]);

    autoTable(doc, {
        startY: 75,
        head: [['Rank', 'Nickname', 'Score', 'Accuracy']],
        body: leaderboardData,
        theme: 'striped',
        headStyles: { fillColor: [57, 243, 166] }, // NextQiz brand color
        margin: { bottom: 20 }
    });

    // Add watermark to first page
    addWatermark(doc, currentPage, sortedPlayers.length + 2); // Estimate total pages

    // -- Detailed Student Reports --
    let finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.addPage();
    currentPage++;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Student Reports', 14, 20);
    finalY = 30;

    sortedPlayers.forEach((player, index) => {
        // Check if we need a new page
        if (finalY > 250) {
            // Add watermark before creating new page
            addWatermark(doc, currentPage, sortedPlayers.length + 2);
            doc.addPage();
            currentPage++;
            finalY = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${player.nickname} - Score: ${player.score}`, 14, finalY);

        const answerRows = player.answers.map(ans => {
            const question = gameData.quizQuestions[ans.questionIndex];
            // Handle case where question might not exist (if quiz changed)
            if (!question) return ['Unknown', 'Unknown', 'Unknown', 'N/A'];

            return [
                `Q${ans.questionIndex + 1}`,
                question.questionText.substring(0, 40) + (question.questionText.length > 40 ? '...' : ''),
                ans.isCorrect ? '✓ Correct' : '✗ Incorrect',
                `${ans.timeTaken}s`
            ];
        });

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Q#', 'Question', 'Result', 'Time']],
            body: answerRows,
            theme: 'grid',
            headStyles: { fillColor: [100, 100, 100] },
            styles: { fontSize: 10 },
            margin: { bottom: 20 }
        });

        finalY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Add watermark to last page
    addWatermark(doc, currentPage, currentPage);

    doc.save(`NextQiz_Report_${gameData.pin}.pdf`);
};
