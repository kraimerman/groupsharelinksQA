import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Pencil, Share2, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { useChatStore } from '../store';
import { Link } from '../types';
import MemberList from './MemberList';
import ShareLinkModal from './ShareLinkModal';
import CommentsModal from './CommentsModal';
import EditLinkModal from './EditLinkModal';
import EditGroupModal from './EditGroupModal';

export default function ChatArea() {
  const { activeGroupId, groups, user, toggleVote, addComment } = useChatStore();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [linkToEdit, setLinkToEdit] = useState<Link | null>(null);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  if (!activeGroup || !user) return null;

  const isGroupOwner = activeGroup.createdBy === user.email;

  const sortedLinks = [...(activeGroup.links || [])].sort((a, b) => {
    const aScore = (a.votes.up.length - a.votes.down.length);
    const bScore = (b.votes.up.length - b.votes.down.length);
    return bScore - aScore;
  });

  const toggleComments = (linkId: string) => {
    setExpandedComments(prev => 
      prev.includes(linkId) 
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    );
  };

  const handleAddComment = async (linkId: string, comment: string) => {
    if (comment.trim()) {
      await addComment(activeGroup.id, linkId, comment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-gray-800">{activeGroup.name}</h2>
              {isGroupOwner && (
                <button
                  onClick={() => setShowEditGroupModal(true)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  title="Edit group name"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Create Link</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sortedLinks.map((link) => (
            <div
              key={link.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {link.title}
                      </a>
                    </h3>
                    {link.author === user.email && (
                      <button
                        onClick={() => setLinkToEdit(link)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    Shared by {link.authorNickname} • {new Date(link.timestamp).toLocaleString()}
                  </p>
                  {link.description && (
                    <p className="text-gray-600 mb-3">{link.description}</p>
                  )}
                </div>
                {link.thumbnail && (
                  <img
                    src={link.thumbnail}
                    alt={link.title}
                    className="w-24 h-24 object-cover rounded ml-4"
                  />
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleVote(activeGroup.id, link.id, 'up')}
                    className={`p-1 rounded-full ${
                      link.votes.up.includes(user.email)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium">{link.votes.up.length}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleVote(activeGroup.id, link.id, 'down')}
                    className={`p-1 rounded-full ${
                      link.votes.down.includes(user.email)
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium">{link.votes.down.length}</span>
                </div>

                <button
                  onClick={() => toggleComments(link.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm">{link.comments.length}</span>
                  {expandedComments.includes(link.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {expandedComments.includes(link.id) && (
                <div className="mt-4 space-y-3 border-t pt-3">
                  {link.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{comment.authorNickname}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  ))}
                  
                  <div className="mt-3 flex space-x-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment(link.id, newComment);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(link.id, newComment)}
                      disabled={!newComment.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <MemberList groupId={activeGroup.id} />

      {showShareModal && (
        <ShareLinkModal
          groupId={activeGroup.id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showEditGroupModal && (
        <EditGroupModal
          group={activeGroup}
          onClose={() => setShowEditGroupModal(false)}
        />
      )}

      {selectedLink && (
        <CommentsModal
          groupId={activeGroup.id}
          link={selectedLink}
          onClose={() => setSelectedLink(null)}
        />
      )}

      {linkToEdit && (
        <EditLinkModal
          groupId={activeGroup.id}
          link={linkToEdit}
          onClose={() => setLinkToEdit(null)}
        />
      )}
    </div>
  );
}