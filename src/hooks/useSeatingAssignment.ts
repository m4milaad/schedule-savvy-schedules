import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  generateSeatingArrangement,
  saveSeatingArrangement,
  getSavedSeatingArrangement,
  VenueSeatingPlan,
  SeatingResult
} from '@/utils/seatingAlgorithm';
import { getCachedData, isOnline, setCachedData, DEFAULT_TTL } from '@/lib/offlineCache';
import { queryKeys } from '@/lib/queryKeys';

export function useSeatingAssignment(examDate: string | null, deptId?: string) {
  const queryClient = useQueryClient();
  const [generatedPlan, setGeneratedPlan] = useState<SeatingResult | null>(null);

  // Fetch saved seating arrangement
  const { data: savedSeating, isLoading: loadingSaved, refetch } = useQuery({
    queryKey: deptId 
      ? queryKeys.seatAssignments.byDateAndDept(examDate!, deptId)
      : queryKeys.seatAssignments.byDate(examDate!),
    queryFn: async () => {
      if (!examDate) return [];

      const cacheKey = deptId
        ? `seat_assignments_${examDate}_${deptId}`
        : `seat_assignments_${examDate}_all`;

      if (!(await isOnline())) {
        const cached = await getCachedData<VenueSeatingPlan[]>(cacheKey, DEFAULT_TTL.SEAT_ASSIGNMENT);
        if (cached) {
          return cached.data;
        }
      }

      try {
        const seating = await getSavedSeatingArrangement(examDate, deptId);
        await setCachedData(cacheKey, seating);
        return seating;
      } catch (error) {
        const cached = await getCachedData<VenueSeatingPlan[]>(cacheKey, DEFAULT_TTL.SEAT_ASSIGNMENT);
        if (cached) {
          return cached.data;
        }
        throw error;
      }
    },
    enabled: !!examDate,
    staleTime: 10 * 60 * 1000, // 10 minutes - seat assignments change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Generate new seating arrangement
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!examDate) throw new Error('No exam date selected');
      return generateSeatingArrangement(examDate, deptId);
    },
    onSuccess: (result) => {
      setGeneratedPlan(result);
      if (result.success) {
        toast.success(`Generated seating for ${result.venues.reduce((acc, v) => 
          acc + v.seats.flat().filter(s => s !== null).length, 0
        )} students`);
        if (result.unassigned.length > 0) {
          toast.warning(`${result.unassigned.length} students could not be assigned seats`);
        }
      } else {
        toast.error(result.error || 'Failed to generate seating');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate seating');
    }
  });

  // Save seating arrangement
  const saveMutation = useMutation({
    mutationFn: async (venues: VenueSeatingPlan[]) => {
      if (!examDate) throw new Error('No exam date selected');
      return saveSeatingArrangement(examDate, venues);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Seating arrangement saved successfully');
        queryClient.invalidateQueries({ queryKey: queryKeys.seatAssignments.all });
        setGeneratedPlan(null);
        refetch();
      } else {
        toast.error(result.error || 'Failed to save seating');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save seating');
    }
  });

  // Clear seating for a date
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!examDate) throw new Error('No exam date selected');
      const { error } = await supabase
        .from('seat_assignments')
        .delete()
        .eq('exam_date', examDate);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Seating arrangement cleared');
      queryClient.invalidateQueries({ queryKey: queryKeys.seatAssignments.all });
      setGeneratedPlan(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clear seating');
    }
  });

  const generate = useCallback(() => {
    generateMutation.mutate();
  }, [generateMutation]);

  const save = useCallback((venues: VenueSeatingPlan[]) => {
    saveMutation.mutate(venues);
  }, [saveMutation]);

  const clear = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  return {
    savedSeating: savedSeating || [],
    generatedPlan,
    loadingSaved,
    isGenerating: generateMutation.isPending,
    isSaving: saveMutation.isPending,
    isClearing: clearMutation.isPending,
    generate,
    save,
    clear,
    clearGeneratedPlan: () => setGeneratedPlan(null)
  };
}
