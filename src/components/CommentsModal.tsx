import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useChatStore } from '../store';
import { Link } from '../types';

interface CommentsModalProps {
  groupId: string;
  link: Link;
  onClose: () => void;
}

export default function CommentsModal({ groupId, link, onClose }: CommentsModalProps) {
  const { addComment } = useChatStore();
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      await addComment(groupId, link.id, comment.trim());
      setComment('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Comments</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto mb-4">
          <h4 className="font-medium text-lg mb-2">{link.title}</h4>
          <p className="text-gray-600 text-sm mb-4">{link.description}</p>
          
          <div className="space-y-4">
            {link.comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{comment.author}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!comment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}