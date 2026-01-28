import { useCallback } from "react";
import { id } from "@instantdb/react-native";
import { db } from "@/lib/db";

export interface VocabularyTerm {
  id: string;
  term: string;
  createdAt: number;
}

export function useVocabulary() {
  const { data, isLoading, error } = db.useQuery({
    vocabularyTerms: {
      $: { order: { createdAt: "desc" } },
    },
  });

  const terms = (data?.vocabularyTerms ?? []) as VocabularyTerm[];

  const addTerm = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    // Check for duplicate
    const exists = terms.some(
      (t) => t.term.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return;

    await db.transact(
      db.tx.vocabularyTerms[id()].update({
        term: trimmed,
        createdAt: Date.now(),
      })
    );
  }, [terms]);

  const removeTerm = useCallback(async (termId: string) => {
    await db.transact(db.tx.vocabularyTerms[termId].delete());
  }, []);

  return {
    terms,
    isLoading,
    error,
    addTerm,
    removeTerm,
  };
}
