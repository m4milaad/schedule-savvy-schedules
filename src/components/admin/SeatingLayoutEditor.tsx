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
    joined_rows: number[];
  };
  onSave: () => void;
}

export const SeatingLayoutEditor: React.FC<SeatingLayoutEditorProps> = ({ venue, onSave }) => {
  const [rowsCount, setRowsCount] = useState(venue.rows_count || 4);
  const [columnsCount, setColumnsCount] = useState(venue.columns_count || 6);
  const [joinedRows, setJoinedRows] = useState<number[]>(venue.joined_rows || []);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setRowsCount(venue.rows_count || 4);
    setColumnsCount(venue.columns_count || 6);
    setJoinedRows(venue.joined_rows || []);
  }, [venue]);

  const toggleJoinedRow = (rowNumber: number) => {
    if (rowNumber >= rowsCount) return; // Can't join last row
    
    setJoinedRows(prev => {
      if (prev.includes(rowNumber)) {
        return prev.filter(r => r !== rowNumber);
      } else {
        return [...prev, rowNumber].sort((a, b) => a - b);
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
          joined_rows: joinedRows
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

  const isRowJoined = (row: number) => joinedRows.includes(row);
  const isRowPartOfJoin = (row: number) => joinedRows.includes(row) || joinedRows.includes(row - 1);

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
            <Label>Number of Rows</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={rowsCount}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setRowsCount(val);
                // Remove joined rows that are out of bounds
                setJoinedRows(prev => prev.filter(r => r < val));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Columns per Row</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={columnsCount}
              onChange={(e) => setColumnsCount(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* Joined Rows Configuration */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Joined Rows (click to join with next row)
          </Label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: rowsCount - 1 }, (_, i) => i + 1).map(row => (
              <Button
                key={row}
                variant={isRowJoined(row) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleJoinedRow(row)}
                className="gap-1"
              >
                {isRowJoined(row) ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                Row {row} + {row + 1}
              </Button>
            ))}
          </div>
          {joinedRows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Joined: {joinedRows.map(r => `Rows ${r}-${r + 1}`).join(', ')}
            </p>
          )}
        </div>

        {/* Visual Preview */}
        <div className="space-y-3">
          <Label>Layout Preview</Label>
          <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
            <div className="inline-block min-w-max">
              {Array.from({ length: rowsCount }, (_, rowIdx) => {
                const rowNum = rowIdx + 1;
                const isJoined = isRowJoined(rowNum);
                const isPartOfJoin = isRowPartOfJoin(rowNum);
                
                return (
                  <div 
                    key={rowNum} 
                    className={`flex items-center gap-1 mb-1 ${
                      isPartOfJoin ? 'bg-primary/10 rounded px-2 py-1' : ''
                    } ${isJoined ? 'border-b-2 border-dashed border-primary' : ''}`}
                  >
                    <span className="w-16 text-xs text-muted-foreground">
                      Row {rowNum}
                      {isJoined && ' ⟨'}
                      {joinedRows.includes(rowNum - 1) && ' ⟩'}
                    </span>
                    {Array.from({ length: columnsCount }, (_, colIdx) => {
                      const colNum = colIdx + 1;
                      const isA = colNum % 2 === 1;
                      return (
                        <div
                          key={colNum}
                          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                            isA 
                              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                              : 'bg-green-500/20 text-green-700 dark:text-green-300'
                          }`}
                        >
                          {isA ? 'A' : 'B'}
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
          <span className="text-sm">Total Capacity:</span>
          <Badge variant="secondary" className="text-lg px-3">
            {rowsCount * columnsCount} seats
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
