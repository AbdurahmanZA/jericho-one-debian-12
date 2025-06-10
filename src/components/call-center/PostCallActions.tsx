
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, CheckCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PostCallActionsProps {
  callNotes: string;
  callOutcome: string;
  onNotesChange: (notes: string) => void;
  onOutcomeChange: (outcome: string) => void;
  onSaveNotes: () => void;
}

const PostCallActions = ({ 
  callNotes, 
  callOutcome, 
  onNotesChange, 
  onOutcomeChange, 
  onSaveNotes 
}: PostCallActionsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Post-Call Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Call Outcome</label>
          <Select value={callOutcome} onValueChange={onOutcomeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select call outcome..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qualified">Qualified Lead</SelectItem>
              <SelectItem value="callback">Callback Required</SelectItem>
              <SelectItem value="not-interested">Not Interested</SelectItem>
              <SelectItem value="no-answer">No Answer</SelectItem>
              <SelectItem value="voicemail">Left Voicemail</SelectItem>
              <SelectItem value="wrong-number">Wrong Number</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Call Notes</label>
          <Textarea
            value={callNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Enter detailed notes about the conversation..."
            rows={4}
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onSaveNotes} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Save & Next Lead
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Callback
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCallActions;
