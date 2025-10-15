import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import CardContent from '@/components/CardContent';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFeedStore } from '@/store/useFeedStore';
import { Filter, Loader2, Theater } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Home page - Hero section + infinite scroll content feed
 * Features: Filter by tag, sort options, lazy loading with intersection observer
 */
export default function Home() {
  const { filters, setFilter } = useFeedStore();
  const [page, setPage] = useState(1);
  const [allContents, setAllContents] = useState([]);
  const observerRef = useRef(null);

  // Fetch contents with pagination
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['/api/contents', page, filters.tag, filters.sortBy],
    enabled: true,
  });

  // Append new contents when data changes
  useEffect(() => {
    if (data?.contents) {
      setAllContents(prev => page === 1 ? data.contents : [...prev, ...data.contents]);
    }
  }, [data, page]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching && data?.hasMore) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [isFetching, data?.hasMore]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setAllContents([]);
  }, [filters.tag, filters.sortBy]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-vr-overlay">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 drop-shadow-2xl" data-testid="text-hero-title">
            Experience Theatre
            <br />
            <span className="text-spotlight-gold">in Virtual Reality</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto drop-shadow-lg">
            Immergiti nelle migliori produzioni teatrali del mondo attraverso esperienze VR mozzafiato
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border-2 border-white/50 text-lg px-8"
              onClick={() => document.getElementById('content-section')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-browse-content"
            >
              <Theater className="h-5 w-5 mr-2" />
              Esplora Contenuti
            </Button>
            <Link href="/seller/register">
              <Button 
                size="lg" 
                variant="outline"
                className="bg-transparent backdrop-blur-md hover:bg-white/10 text-white border-2 border-white/50 text-lg px-8"
                data-testid="button-become-seller"
              >
                Diventa Venditore
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/70 rounded-full" />
          </div>
        </div>
      </section>

      {/* Content Feed Section */}
      <section id="content-section" className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        {/* Filter Bar */}
        <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-md border-y border-border py-4 mb-8 -mx-4 px-4 md:-mx-8 md:px-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h2 className="text-2xl md:text-3xl font-serif font-bold">
              Spettacoli VR
            </h2>
            
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              {/* Tag Filter */}
              <Select value={filters.tag} onValueChange={(value) => setFilter('tag', value)}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-tag-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="drammatico">Drammatico</SelectItem>
                  <SelectItem value="commedia">Commedia</SelectItem>
                  <SelectItem value="balletto">Balletto</SelectItem>
                  <SelectItem value="opera">Opera</SelectItem>
                  <SelectItem value="dietrolequinte">Dietro le Quinte</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Filter */}
              <Select value={filters.sortBy} onValueChange={(value) => setFilter('sortBy', value)}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-sort-filter">
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Più Recenti</SelectItem>
                  <SelectItem value="recommended">Consigliati</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading && page === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : allContents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="content-grid">
              {allContents.map((content) => (
                <CardContent key={content.id} content={content} />
              ))}
            </div>

            {/* Loading More Indicator */}
            {isFetching && (
              <div className="flex justify-center mt-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Intersection Observer Target */}
            <div ref={observerRef} className="h-20" />
          </>
        ) : (
          <div className="text-center py-20">
            <Theater className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nessun contenuto trovato</h3>
            <p className="text-muted-foreground">
              Prova a modificare i filtri o torna più tardi
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
