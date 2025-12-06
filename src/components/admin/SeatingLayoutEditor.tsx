import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Grid3X3, Link2, Unlink, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SeatingLayoutEditorProps {
  venue: {
    venue_id: string;
    venue_name: string;
    rows_count: number;
    columns_count: number;
    joined_columns: number[];  // Columns that are joined with the next column
  };
  onSave: () => void;
}

export const SeatingLayoutEditor: React.FC<SeatingLayoutEditorProps> = ({ venue, onSave }) => {
  const [rowsCount, setRowsCount] = useState(venue.rows_count || 6);
  const [columnsCount, setColumnsCount] = useState(venue.columns_count || 4);
  const [joinedColumns, setJoinedColumns] = useState<number[]>(venue.joined_columns || []);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setRowsCount(venue.rows_count || 6);
    setColumnsCount(venue.columns_count || 4);
    setJoinedColumns(venue.joined_columns || []);
  }, [venue]);

  const toggleJoinedColumn = (colNumber: number) => {
    if (colNumber >= columnsCount) return; // Can't join last column
    
    setJoinedColumns(prev => {
      if (prev.includes(colNumber)) {
        return prev.filter(c => c !== colNumber);
      } else {
        return [...prev, colNumber].sort((a, b) => a - b);
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          rows_count: rowsCount,
          columns_count: columnsCount,
          joined_rows: joinedColumns  // DB field is still joined_rows for compatibility
        })
        .eq('venue_id', venue.venue_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Venue layout saved successfully",
      });
      onSave();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save venue layout",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isColumnJoined = (col: number) => joinedColumns.includes(col);
  const isColumnPartOfJoin = (col: number) => joinedColumns.includes(col) || joinedColumns.includes(col - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5" />
          Seating Layout: {venue.venue_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Number of Rows (horizontal positions)</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={rowsCount}
              onChange={(e) => setRowsCount(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label>Number of Columns (vertical benches)</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={columnsCount}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setColumnsCount(val);
                // Remove joined columns that are out of bounds
                setJoinedColumns(prev => prev.filter(c => c < val));
              }}
            />
          </div>
        </div>

        {/* Joined Columns Configuration */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Joined Columns (click to join with next column)
          </Label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: columnsCount - 1 }, (_, i) => i + 1).map(col => (
              <Button
                key={col}
                variant={isColumnJoined(col) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleJoinedColumn(col)}
                className="gap-1"
              >
                {isColumnJoined(col) ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                Col {col} + {col + 1}
              </Button>
            ))}
          </div>
          {joinedColumns.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Joined: {joinedColumns.map(c => `Cols ${c}-${c + 1}`).join(', ')}
            </p>
          )}
        </div>

        {/* Visual Preview */}
        <div className="space-y-3">
          <Label>Layout Preview</Label>
          <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
            <div className="inline-block min-w-max">
              {/* Column headers */}
              <div className="flex items-center gap-1 mb-2">
                <span className="w-16"></span>
                {Array.from({ length: columnsCount }, (_, colIdx) => {
                  const colNum = colIdx + 1;
                  const isJoined = isColumnJoined(colNum);
                  const isPartOfJoin = isColumnPartOfJoin(colNum);
                  return (
                    <div
                      key={colNum}
                      className={`w-8 text-center text-xs font-medium ${
                        isPartOfJoin ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      C{colNum}
                      {isJoined && '⟩'}
                    </div>
                  );
                })}
              </div>
              {/* Rows */}
              {Array.from({ length: rowsCount }, (_, rowIdx) => {
                const rowNum = rowIdx + 1;
                return (
                  <div key={rowNum} className="flex items-center gap-1 mb-1">
                    <span className="w-16 text-xs text-muted-foreground">
                      Row {rowNum}
                    </span>
                    {Array.from({ length: columnsCount }, (_, colIdx) => {
                      const colNum = colIdx + 1;
                      const isJoined = isColumnJoined(colNum);
                      const isPartOfJoin = isColumnPartOfJoin(colNum);
                      const isA = true; // First position in each bench
                      return (
                        <div
                          key={colNum}
                          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                            isPartOfJoin ? 'ring-1 ring-primary' : ''
                          } ${isJoined ? 'border-r-2 border-primary' : ''} bg-blue-500/20 text-blue-700 dark:text-blue-300`}
                        >
                          A-B
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-blue-500/20" />
              <span>A = Odd Semesters (1, 3, 5...)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500/20" />
              <span>B = Even Semesters (2, 4, 6...)</span>
            </div>
          </div>
        </div>

        {/* Capacity Info */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm">Total Capacity (2 students per bench):</span>
          <Badge variant="secondary" className="text-lg px-3">
            {rowsCount * columnsCount * 2} students
          </Badge>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Layout'}
        </Button>
      </CardContent>
    </Card>
  );
};
