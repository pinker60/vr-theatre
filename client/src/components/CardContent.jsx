import { Link } from 'wouter';
import { Play, Clock, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * CardContent component - Displays VR content card with 16:9 image ratio
 * Features: Hover zoom effect, play icon overlay, duration and tags
 */
export default function CardContent({ content }) {
  const { id, title, description, imageUrl, duration, tags } = content;

  return (
    <Card 
      className="group overflow-hidden hover-elevate transition-all duration-300"
      data-testid={`card-content-${id}`}
    >
      {/* Image Container with 16:9 aspect ratio */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          data-testid={`img-content-${id}`}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button - appears on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link href={`/vr/${id}`} data-testid={`link-play-${id}`}>
            <Button 
              size="icon" 
              className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border-2 border-white/50"
            >
              <Play className="h-8 w-8 text-white fill-white" />
            </Button>
          </Link>
        </div>

        {/* Duration Badge - bottom left */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white border-none">
            <Clock className="h-3 w-3 mr-1" />
            <span className="font-mono text-xs">{duration} min</span>
          </Badge>
        </div>

        {/* First Tag - top right */}
        {tags && tags.length > 0 && (
          <div className="absolute top-3 right-3">
            <Badge variant="default" className="bg-primary/90 backdrop-blur-sm">
              <Tag className="h-3 w-3 mr-1" />
              {tags[0]}
            </Badge>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-6 space-y-3">
        <h3 className="text-xl font-serif font-semibold line-clamp-1" data-testid={`text-title-${id}`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${id}`}>
          {description}
        </p>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs"
                data-testid={`badge-tag-${tag}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <Link href={`/vr/${id}`}>
          <Button 
            className="w-full mt-4" 
            variant="default"
            data-testid={`button-open-vr-${id}`}
          >
            <Play className="h-4 w-4 mr-2" />
            Open VR Experience
          </Button>
        </Link>
      </div>
    </Card>
  );
}
