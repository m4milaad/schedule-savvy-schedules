import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Library, Search, BookOpen, Calendar, AlertCircle, RefreshCw, RotateCcw, Clock } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

interface StudentLibraryTabProps {
  studentId: string;
}

interface BookIssue {
  id: string;
  book_id: string;
  issued_date: string;
  due_date: string;
  returned_date: string | null;
  status: string;
  late_fee: number;
  renewed_count: number;
  book?: {
    title: string;
    author: string;
    isbn: string;
    category: string;
  };
}

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  available_copies: number;
  total_copies: number;
  location: string;
}

export const StudentLibraryTab: React.FC<StudentLibraryTabProps> = ({ studentId }) => {
  const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
  const [availableBooks, setAvailableBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      await Promise.all([loadBookIssues(), loadAvailableBooks()]);
    } finally {
      setLoading(false);
    }
  };

  const loadBookIssues = async () => {
    const { data, error } = await supabase
      .from('book_issues')
      .select(`
        *,
        library_books:book_id (title, author, isbn, category)
      `)
      .eq('student_id', studentId)
      .order('issued_date', { ascending: false });

    if (error) {
      console.error('Error loading book issues:', error);
      return;
    }

    const transformed = (data || []).map((issue: any) => ({
      ...issue,
      book: issue.library_books
    }));

    setBookIssues(transformed);
  };

  const loadAvailableBooks = async () => {
    const { data, error } = await supabase
      .from('library_books')
      .select('*')
      .gt('available_copies', 0)
      .order('title');

    if (error) {
      console.error('Error loading books:', error);
      return;
    }

    setAvailableBooks(data || []);
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  
  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    return days;
  };

  const activeIssues = bookIssues.filter(b => b.status === 'active');
  const returnedIssues = bookIssues.filter(b => b.status === 'returned');
  const totalFees = bookIssues.reduce((sum, b) => sum + (b.late_fee || 0), 0);
  const nextDue = activeIssues.length > 0 
    ? activeIssues.reduce((earliest, b) => 
        new Date(b.due_date) < new Date(earliest.due_date) ? b : earliest
      )
    : null;

  const filteredBooks = availableBooks.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="linear-surface overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeIssues.length}</p>
                <p className="text-xs text-muted-foreground">Books Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="linear-surface overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <RotateCcw className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{returnedIssues.length}</p>
                <p className="text-xs text-muted-foreground">Books Returned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="linear-surface overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{totalFees}</p>
                <p className="text-xs text-muted-foreground">Pending Fees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="linear-surface overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {nextDue ? format(new Date(nextDue.due_date), 'MMM dd') : '--'}
                </p>
                <p className="text-xs text-muted-foreground">Next Due Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Books */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="linear-kicker">Catalog</div>
          <CardTitle className="text-base font-semibold">
            Search & Request Books
          </CardTitle>
          <CardDescription>Browse available books in the library</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {filteredBooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No books found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.slice(0, 10).map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-xs text-muted-foreground">ISBN: {book.isbn || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{book.category || 'General'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={book.available_copies > 0 ? 'bg-green-500' : 'bg-red-500'}>
                          {book.available_copies}/{book.total_copies}
                        </Badge>
                      </TableCell>
                      <TableCell>{book.location || 'Main Library'}</TableCell>
                      <TableCell>
                        <Button size="sm" disabled={book.available_copies === 0}>
                          Request
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currently Issued Books */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="linear-kicker">Active</div>
          <CardTitle className="text-base font-semibold">
            Currently Issued Books
          </CardTitle>
          <CardDescription>Books you have currently checked out</CardDescription>
        </CardHeader>
        <CardContent>
          {activeIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No books currently issued</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeIssues.map((issue) => {
                const daysRemaining = getDaysRemaining(issue.due_date);
                const overdue = isOverdue(issue.due_date);
                
                return (
                  <div 
                    key={issue.id} 
                    className={`p-4 border rounded-lg ${overdue ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{issue.book?.title}</h3>
                        <p className="text-sm text-muted-foreground">{issue.book?.author}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Issued: {format(new Date(issue.issued_date), 'MMM dd, yyyy')}</span>
                          <span className={overdue ? 'text-red-500 font-medium' : ''}>
                            Due: {format(new Date(issue.due_date), 'MMM dd, yyyy')}
                          </span>
                          {issue.renewed_count > 0 && (
                            <Badge variant="outline">Renewed {issue.renewed_count}x</Badge>
                          )}
                        </div>
                        {overdue && issue.late_fee > 0 && (
                          <p className="text-sm text-red-500 mt-1">
                            Late fee: ₹{issue.late_fee}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {overdue ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {daysRemaining} days left
                          </Badge>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={issue.renewed_count >= 2}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Renew
                          </Button>
                          <Button size="sm">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Return
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};