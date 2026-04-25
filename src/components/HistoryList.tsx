import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";

export interface HistoryEntry {
  id: string;
  recorded_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
}

interface Props {
  entries: HistoryEntry[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export const HistoryList = ({ entries, onView, onDelete }: Props) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Ιστορικό μετρήσεων</h2>
        <p className="text-sm text-muted-foreground">{entries.length} {entries.length === 1 ? "καταγραφή" : "καταγραφές"}</p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Καμία καταγραφή ακόμη.<br />Πάτα «Νέα» για να ξεκινήσεις.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <Card key={e.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">
                    #{String(entries.length - i).padStart(2, "0")} · {format(new Date(e.recorded_at), "dd/MM/yyyy", { locale: el })}
                  </div>
                  <div className="font-semibold tabular-nums">
                    {Number(e.weight_kg).toFixed(1)} kg
                    {e.body_fat_pct != null && (
                      <span className="text-muted-foreground font-normal text-sm ml-2">
                        · {Number(e.body_fat_pct).toFixed(1)}% λίπος
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onView(e.id)}>
                  <Eye className="w-4 h-4 mr-1" /> Προβολή
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(e.id)} aria-label="Διαγραφή">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
