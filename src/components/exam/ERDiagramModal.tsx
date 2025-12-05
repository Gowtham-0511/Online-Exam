import { X, Table as TableIcon, Database, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import type { SchemaData } from '@/types/exam.types';

interface ERDiagramModalProps {
    schemaData: SchemaData;
    onClose: () => void;
}

export default function ERDiagramModal({ schemaData, onClose }: ERDiagramModalProps) {
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter tables based on search (using table_name from your types)
    const filteredTables = schemaData.schemaData.filter(table =>
        table.table_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get relationships for a specific table
    const getTableRelationships = (tableName: string) => {
        return schemaData.relationships.filter(
            rel => rel.from_table === tableName || rel.to_table === tableName
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Database className="w-6 h-6 text-purple-500" />
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">Database Schema</h2>
                                <p className="text-sm text-muted-foreground">
                                    {schemaData.schemaData.length} tables • {schemaData.serverType}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="Search tables..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTables.map((table) => {
                            const relationships = getTableRelationships(table.table_name);
                            const isSelected = selectedTable === table.table_name;

                            return (
                                <div
                                    key={table.table_name}
                                    onClick={() => setSelectedTable(isSelected ? null : table.table_name)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                            ? 'border-purple-500 bg-purple-500/10 shadow-lg'
                                            : 'border-border hover:border-purple-500/50 hover:bg-muted/50'
                                        }`}
                                >
                                    {/* Table Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <TableIcon className="w-4 h-4 text-purple-500" />
                                            <h3 className="font-bold text-foreground">{table.table_name}</h3>
                                        </div>
                                        {relationships.length > 0 && (
                                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                                {relationships.length} rel
                                            </span>
                                        )}
                                    </div>

                                    {/* Columns */}
                                    <div className="space-y-1">
                                        {table.columns.map((column, idx) => {
                                            const isPrimaryKey = column.column_key === 'PRI';
                                            const isForeignKey = column.column_key === 'MUL' || column.column_key === 'FK';

                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 text-xs py-1"
                                                >
                                                    <span
                                                        className={`w-1 h-1 rounded-full ${isPrimaryKey
                                                                ? 'bg-yellow-500'
                                                                : isForeignKey
                                                                    ? 'bg-blue-500'
                                                                    : 'bg-gray-400'
                                                            }`}
                                                    />
                                                    <span className="font-mono text-foreground">
                                                        {column.column_name}
                                                    </span>
                                                    <span className="text-muted-foreground text-[10px]">
                                                        {column.data_type}
                                                    </span>
                                                    {isPrimaryKey && (
                                                        <span className="text-yellow-600 text-[10px] font-semibold">
                                                            PK
                                                        </span>
                                                    )}
                                                    {isForeignKey && (
                                                        <span className="text-blue-600 text-[10px] font-semibold">
                                                            FK
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Relationships (when selected) */}
                                    {isSelected && relationships.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                <LinkIcon className="w-3 h-3" />
                                                Relationships
                                            </div>
                                            {relationships.map((rel, idx) => (
                                                <div
                                                    key={idx}
                                                    className="text-xs text-muted-foreground py-1"
                                                >
                                                    {rel.from_table === table.table_name ? (
                                                        <span>
                                                            {rel.from_column} → {rel.to_table}.{rel.to_column}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {rel.from_table}.{rel.from_column} → {rel.to_column}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {filteredTables.length === 0 && (
                        <div className="text-center py-12">
                            <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No tables found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="p-4 border-t border-border bg-muted/30">
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            <span>Primary Key (PK)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>Foreign Key (FK)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            <span>Regular Column</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}