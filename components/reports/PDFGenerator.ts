
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

export const generatePDFReport = (gameData: GameData) => {
    const doc = new jsPDF();

    // -- Header --
    doc.setFontSize(22);
    doc.text('NextQiz Report', 14, 20);

    doc.setFontSize(14);
    doc.text(`Quiz: ${gameData.quizTitle}`, 14, 30);
    doc.text(`Date: ${new Date(gameData.date).toLocaleDateString()}`, 14, 38);
    doc.text(`Game PIN: ${gameData.pin}`, 14, 46);
    doc.text(`Total Players: ${gameData.players.length}`, 14, 54);

    // -- Leaderboard Table --
    doc.setFontSize(18);
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
        headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    });

    // -- Detailed Student Reports --
    let finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.addPage();
    doc.setFontSize(18);
    doc.text('Detailed Student Reports', 14, 20);
    finalY = 30;

    sortedPlayers.forEach((player, index) => {
        // Check if we need a new page
        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(14);
        doc.text(`${index + 1}. ${player.nickname} - Score: ${player.score}`, 14, finalY);

        const answerRows = player.answers.map(ans => {
            const question = gameData.quizQuestions[ans.questionIndex];
            // Handle case where question might not exist (if quiz changed)
            if (!question) return ['Unknown', 'Unknown', 'Unknown', 'N/A'];

            return [
                `Q${ans.questionIndex + 1}`,
                question.questionText.substring(0, 40) + (question.questionText.length > 40 ? '...' : ''),
                ans.isCorrect ? 'Correct' : 'Incorrect',
                `${ans.timeTaken}s`
            ];
        });

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Q#', 'Question', 'Result', 'Time']],
            body: answerRows,
            theme: 'grid',
            headStyles: { fillColor: [100, 100, 100] },
            styles: { fontSize: 10 }
        });

        finalY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`NextQiz_Report_${gameData.pin}.pdf`);
};
