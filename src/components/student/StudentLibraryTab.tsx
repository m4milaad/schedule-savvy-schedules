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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Library</div>
              <CardTitle className="text-base font-semibold">
                Library Overview
              </CardTitle>
              <CardDescription>
                Track your issued books and browse the catalog.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="linear-pill">
                <span className="font-medium text-foreground">
                  {activeIssues.length}
                </span>
                <span>issued</span>
              </div>
              <div className="linear-pill">
                <span className="font-medium text-foreground">
                  {returnedIssues.length}
                </span>
                <span>returned</span>
              </div>
              <div className="linear-pill">
                <span className="font-medium text-foreground">
                  ₹{totalFees}
                </span>
                <span>fees</span>
              </div>
              <div className="linear-pill">
                <span className="font-medium text-foreground">
                  {nextDue
                    ? format(new Date(nextDue.due_date), 'MMM dd')
                    : '--'}
                </span>
                <span>next due</span>
              </div>
            </div>
          </div>

          {/* Top search bar, like Notices */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background/80 border-border pl-10 backdrop-blur-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Search Books */}
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold tracking-tight">
                Search & Request Books
              </h3>
              <p className="text-xs text-muted-foreground">
                Browse available books in the library.
              </p>
            </div>
            {filteredBooks.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Library className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-sm font-medium">No books found</p>
                <p className="mt-1 text-xs">
                  Try a different search or check back later.
                </p>
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
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooks.slice(0, 10).map((book) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{book.title}</p>
                            <p className="text-xs text-muted-foreground">
                              ISBN: {book.isbn || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {book.category || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              book.available_copies > 0
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }
                          >
                            {book.available_copies}/{book.total_copies}
                          </Badge>
                        </TableCell>
                        <TableCell>{book.location || 'Main Library'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={book.available_copies === 0}
                          >
                            Request
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Currently Issued Books */}
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold tracking-tight">
                Currently Issued Books
              </h3>
              <p className="text-xs text-muted-foreground">
                Books you have currently checked out.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/40 bg-background/40">
              {activeIssues.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-sm font-medium">No books currently issued</p>
                  <p className="mt-1 text-xs">
                    When you issue a book, it will appear in this list.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="linear-table">
                    <thead>
                      <tr>
                        <th className="linear-th">Book</th>
                        <th className="linear-th hidden md:table-cell">Dates</th>
                        <th className="linear-th hidden lg:table-cell">Status</th>
                        <th className="linear-th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeIssues.map((issue) => {
                        const daysRemaining = getDaysRemaining(issue.due_date);
                        const overdue = isOverdue(issue.due_date);

                        return (
                          <tr key={issue.id} className="linear-tr align-top">
                            <td className="linear-td">
                              <div className="font-medium">
                                {issue.book?.title}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {issue.book?.author} • ISBN:{' '}
                                {issue.book?.isbn || 'N/A'}
                              </div>
                              {issue.renewed_count > 0 && (
                                <div className="mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-[11px]"
                                  >
                                    Renewed {issue.renewed_count}x
                                  </Badge>
                                </div>
                              )}
                              {overdue && issue.late_fee > 0 && (
                                <div className="mt-1 text-xs text-red-500">
                                  Late fee: ₹{issue.late_fee}
                                </div>
                              )}
                            </td>
                            <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                              <div>
                                <span>
                                  Issued:{' '}
                                  {format(
                                    new Date(issue.issued_date),
                                    'MMM dd, yyyy',
                                  )}
                                </span>
                              </div>
                              <div
                                className={
                                  overdue
                                    ? 'mt-1 font-medium text-red-500'
                                    : 'mt-1'
                                }
                              >
                                Due:{' '}
                                {format(
                                  new Date(issue.due_date),
                                  'MMM dd, yyyy',
                                )}
                              </div>
                            </td>
                            <td className="linear-td hidden lg:table-cell">
                              {overdue ? (
                                <Badge
                                  variant="destructive"
                                  className="flex items-center gap-1"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              ) : (
                                <Badge className="flex items-center gap-1 bg-green-500">
                                  <Clock className="h-3 w-3" />
                                  {daysRemaining} days left
                                </Badge>
                              )}
                            </td>
                            <td className="linear-td">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={issue.renewed_count >= 2}
                                >
                                  <RefreshCw className="mr-1 h-4 w-4" />
                                  Renew
                                </Button>
                                <Button size="sm">
                                  <RotateCcw className="mr-1 h-4 w-4" />
                                  Return
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};