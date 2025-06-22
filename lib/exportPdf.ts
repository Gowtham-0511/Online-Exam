import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';

interface QuestionAndAnswer {
    question: string;
    answer: string;
}

interface GenerateAnswerPdfParams {
    studentName: string;
    examTitle: string;
    codeAnswer: string;
    questionsAndAnswers?: QuestionAndAnswer[];
    submissionTime: string;
    examId: string;
}

const generateAnswerPdf = async ({
    studentName,
    examTitle,
    codeAnswer,
    questionsAndAnswers = [],
    submissionTime,
    examId
}: GenerateAnswerPdfParams) => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    const titleFontSize = 16;
    const margin = 50;
    let yPosition = height - margin;

    page.drawText(`Exam Submission: ${examTitle}`, {
        x: margin,
        y: yPosition,
        size: titleFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
    });

    yPosition -= 30;

    page.drawText(`Student: ${studentName}`, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
    });

    yPosition -= 20;

    page.drawText(`Exam ID: ${examId}`, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
    });

    yPosition -= 20;

    page.drawText(`Submitted: ${submissionTime}`, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
    });

    yPosition -= 40;

    questionsAndAnswers.forEach((qa, index) => {
        if (yPosition < 150) {
            page = pdfDoc.addPage();
            yPosition = height - margin;
        }

        const cleanQuestion = (qa.question || '').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
        const questionText = `Q${index + 1}: ${cleanQuestion}`;
        const questionLines = wrapText(questionText, width - 2 * margin, fontSize, boldFont);

        questionLines.forEach(line => {
            if (yPosition < 50) {
                page = pdfDoc.addPage();
                yPosition = height - margin;
            }

            page.drawText(line, {
                x: margin,
                y: yPosition,
                size: fontSize,
                font: boldFont,
            });
            yPosition -= 18;
        });

        yPosition -= 10;

        const cleanAnswer = (qa.answer || 'No answer provided').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
        const answerText = `Answer: ${cleanAnswer}`;
        const answerLines = wrapText(answerText, width - 2 * margin, fontSize, font);

        answerLines.forEach(line => {
            if (yPosition < 50) {
                page = pdfDoc.addPage();
                yPosition = height - margin;
            }

            page.drawText(line, {
                x: margin,
                y: yPosition,
                size: fontSize,
                font: font,
            });
            yPosition -= 18;
        });

        yPosition -= 20;
    });

    // if (codeAnswer) {
    //     if (yPosition < 100) {
    //         page = pdfDoc.addPage();
    //         yPosition = height - margin;
    //     }

    //     page.drawText('Code Solution:', {
    //         x: margin,
    //         y: yPosition,
    //         size: fontSize,
    //         font: boldFont,
    //     });

    //     yPosition -= 25;

    //     const cleanCode = codeAnswer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    //     const codeLines = cleanCode.split('\n');

    //     codeLines.forEach(line => {
    //         if (yPosition < 50) {
    //             page = pdfDoc.addPage();
    //             yPosition = height - margin;
    //         }

    //         const cleanLine = line.replace(/\t/g, '    ');
    //         const wrappedLines = wrapText(cleanLine, width - 2 * margin, 10, font);

    //         wrappedLines.forEach(wrappedLine => {
    //             if (yPosition < 50) {
    //                 page = pdfDoc.addPage();
    //                 yPosition = height - margin;
    //             }

    //             page.drawText(wrappedLine, {
    //                 x: margin,
    //                 y: yPosition,
    //                 size: 10,
    //                 font: font,
    //             });
    //             yPosition -= 14;
    //         });
    //     });
    // }

    return await pdfDoc.save();
};

const wrapText = (text: string, maxWidth: number, fontSize: number, font: PDFFont) => {
    const cleanText = text
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const words = cleanText.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;

        try {
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (textWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    lines.push(word);
                }
            }
        } catch (error) {
            console.warn('Text encoding error:', error);
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                lines.push(word);
            }
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [cleanText];
};

export { generateAnswerPdf };