import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';

interface FilterBarProps {
    selectedLanguage: string | null;
    selectedDifficulty: string | null;
    selectedStatus: string | null;
    onLanguageChange: (lang: string | null) => void;
    onDifficultyChange: (diff: string | null) => void;
    onStatusChange: (status: string | null) => void;
}

export const PracticeFilterBar: React.FC<FilterBarProps> = ({
    selectedLanguage,
    selectedDifficulty,
    selectedStatus,
    onLanguageChange,
    onDifficultyChange,
    onStatusChange
}) => {
    const activeFiltersCount = [selectedLanguage, selectedDifficulty, selectedStatus].filter(Boolean).length;

    const clearAllFilters = () => {
        onLanguageChange(null);
        onDifficultyChange(null);
        onStatusChange(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icons.Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters</span>
                    {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {activeFiltersCount}
                        </Badge>
                    )}
                </div>
                {activeFiltersCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-7 text-xs"
                    >
                        Clear all
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {/* Language Filters */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={selectedLanguage === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onLanguageChange(null)}
                        className="h-8"
                    >
                        All Languages
                    </Button>
                    {['Python', 'JavaScript', 'SQL', 'React'].map(lang => (
                        <Button
                            key={lang}
                            variant={selectedLanguage === lang ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onLanguageChange(lang)}
                            className="h-8"
                        >
                            {lang}
                        </Button>
                    ))}
                </div>

                <div className="w-px h-8 bg-border" />

                {/* Difficulty Filters */}
                <div className="flex items-center gap-2">
                    {['Easy', 'Medium', 'Hard'].map(diff => (
                        <Button
                            key={diff}
                            variant={selectedDifficulty === diff ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onDifficultyChange(selectedDifficulty === diff ? null : diff)}
                            className="h-8"
                        >
                            {diff}
                        </Button>
                    ))}
                </div>

                <div className="w-px h-8 bg-border" />

                {/* Status Filters */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={selectedStatus === 'completed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onStatusChange(selectedStatus === 'completed' ? null : 'completed')}
                        className="h-8 gap-1"
                    >
                        <Icons.CheckCircle2 className="h-3 w-3" />
                        Completed
                    </Button>
                    <Button
                        variant={selectedStatus === 'attempted' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onStatusChange(selectedStatus === 'attempted' ? null : 'attempted')}
                        className="h-8 gap-1"
                    >
                        <Icons.Clock className="h-3 w-3" />
                        Attempted
                    </Button>
                    <Button
                        variant={selectedStatus === 'new' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onStatusChange(selectedStatus === 'new' ? null : 'new')}
                        className="h-8 gap-1"
                    >
                        <Icons.Circle className="h-3 w-3" />
                        New
                    </Button>
                </div>
            </div>
        </div>
    );
};