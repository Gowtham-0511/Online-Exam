import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

type Question = {
    text: string;
    options: string[];
    answer: string;
};

export const saveQuestionToBank = async (question: Question, createdBy: string) => {
    await addDoc(collection(db, "questionBank"), {
        ...question,
        createdBy,
        createdAt: new Date().toISOString(),
        tags: [],
    });
};

export const getQuestionBank = async (createdBy: string) => {
    const q = query(collection(db, "questionBank"), where("createdBy", "==", createdBy));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};