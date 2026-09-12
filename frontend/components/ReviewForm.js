'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import api from '../lib/api';
import { useToast } from './ui/Toast';
import { Field, TextArea, TextInput } from './ui/Field';
import Button from './ui/Button';

const RATING_LABELS = {
  1: 'Terrible experience',
  2: 'Below expectations',
  3: 'Average service',
  4: 'Very good experience',
  5: 'Exceptional & highly recommended',
};

export function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const activeRating = hovered || value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-1 rounded-xl hover:bg-amber-50/70 transition-transform duration-150 hover:scale-110 active:scale-95 focus:outline-none"
          >
            <Star
              size={26}
              className={`transition-colors duration-200 ${
                n <= activeRating
                  ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                  : 'text-ink-200'
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold text-amber-700">
        {RATING_LABELS[activeRating] || 'Select your rating'}
      </p>
    </div>
  );
}

export default function ReviewForm({ requirementId, existingReview, onSaved, className = '' }) {
  const { toast } = useToast();
  const isEdit = !!existingReview;
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { rating, title: title.trim() || undefined, comment: comment.trim() || undefined };
      let review;
      if (isEdit) {
        const { data } = await api.patch(`/reviews/${existingReview.id}`, payload);
        review = data.review;
        toast('Your review has been updated', { type: 'success' });
      } else {
        const { data } = await api.post('/reviews', { requirement_id: requirementId, ...payload });
        review = data.review;
        toast('Thanks for your feedback!', { type: 'success' });
      }
      onSaved?.(review);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <p className="text-sm font-semibold text-ink-900">
        {isEdit ? 'Update your review' : 'Leave a review for the provider you hired'}
      </p>

      <Field label="Overall rating" required>
        <StarPicker value={rating} onChange={setRating} />
      </Field>

      <Field label="Review headline (optional)">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Punctual, professional, and solved the issue quickly"
        />
      </Field>

      <Field label="Detailed feedback (optional)" hint="Share details about the work quality, timeliness, and communication">
        <TextArea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your experience in detail..."
        />
      </Field>

      {error && (
        <div className="p-3 rounded-2xl bg-danger-50 border border-danger-200 text-xs text-danger-700 font-medium">
          {error}
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" fullWidth loading={submitting} size="md">
          {isEdit ? 'Update review' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}
