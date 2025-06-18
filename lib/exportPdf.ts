import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateAnswerPdf({
    studentName,
    examTitle,
    codeAnswer,
}: {
    studentName: string;
    examTitle: string;
    codeAnswer: string;
}) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const fontSize = 12;

    const text = `Student: ${studentName}
Exam: ${examTitle}

------------------- Answer -------------------

${codeAnswer}
`;

    page.drawText(text, {
        x: 50,
        y: 750,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        lineHeight: 18,
        maxWidth: 500,
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}
