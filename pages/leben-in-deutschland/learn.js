import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { generalQuestions, stateQuestions, bundeslaender, getImageUrl } from '../../lib/data/lebenInDeutschland';
import SEO from '../../components/SEO';
import styles from '../../styles/LebenInDeutschland.module.css';

const QUESTIONS_PER_PAGE = 10;

const LearnPage = () => {
  const router = useRouter();
  const { state } = router.query;
  const { user } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all'); // 'all', 'general', 'state'
  const [completedQuestions, setCompletedQuestions] = useState([]);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user]);

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/bundesland', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedQuestions(data.lidProgress?.completedQuestions || []);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const getQuestions = () => {
    let questions = [];
    
    if (filter === 'all' || filter === 'general') {
      questions = [...generalQuestions.map(q => ({ ...q, type: 'general' }))];
    }
    
    if ((filter === 'all' || filter === 'state') && state && stateQuestions[state]) {
      const stateQs = stateQuestions[state].map(q => ({ 
        ...q, 
        id: 300 + q.id, 
        type: 'state' 
      }));
      questions = [...questions, ...stateQs];
    }
    
    return questions;
  };

  const questions = getQuestions();
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const currentQuestions = questions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);

  const selectedBundeslandInfo = bundeslaender.find(b => b.code === state);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <SEO
        title="Học - Leben in Deutschland Test"
        description="Xem tất cả 300 câu hỏi kèm đáp án cho bài thi Leben in Deutschland"
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/leben-in-deutschland" className={styles.backLink}>
            ← Quay lại
          </Link>
          <h1 className={styles.title}>
            <span className={styles.flag}>📖</span>
            Học câu hỏi
          </h1>
          {selectedBundeslandInfo && (
            <p className={styles.subtitle}>
              Bao gồm câu hỏi cho {selectedBundeslandInfo.name}
            </p>
          )}
        </div>

        <div className={styles.content}>
          {/* Filter */}
          <div className={styles.filterBar}>
            <button 
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
            >
              Tất cả ({generalQuestions.length + (state && stateQuestions[state] ? stateQuestions[state].length : 0)})
            </button>
            <button 
              className={`${styles.filterBtn} ${filter === 'general' ? styles.active : ''}`}
              onClick={() => { setFilter('general'); setCurrentPage(1); }}
            >
              Chung ({generalQuestions.length})
            </button>
            {state && stateQuestions[state] && (
              <button 
                className={`${styles.filterBtn} ${filter === 'state' ? styles.active : ''}`}
                onClick={() => { setFilter('state'); setCurrentPage(1); }}
              >
                {selectedBundeslandInfo?.name} ({stateQuestions[state].length})
              </button>
            )}
          </div>

          {/* Questions List */}
          <div className={styles.questionsList}>
            {currentQuestions.map((question, idx) => (
              <div key={`${question.type}-${question.id}`} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>
                    Câu {startIndex + idx + 1}
                    {question.type === 'state' && (
                      <span className={styles.stateBadge}>{selectedBundeslandInfo?.name}</span>
                    )}
                  </span>
                  {completedQuestions.includes(question.id) && (
                    <span className={styles.completedBadge}>✓ Đã học</span>
                  )}
                </div>
                
                <p className={styles.questionText}>{question.q}</p>
                
                {question.img && (
                  <div className={styles.questionImage}>
                    <img src={getImageUrl(question.img)} alt="Hình ảnh câu hỏi" />
                  </div>
                )}

                <div className={styles.options}>
                  {question.o.map((option, optIdx) => (
                    <div 
                      key={optIdx}
                      className={`${styles.option} ${optIdx === question.a ? styles.correct : ''}`}
                    >
                      <span className={styles.optionLetter}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className={styles.optionText}>{option}</span>
                      {optIdx === question.a && (
                        <span className={styles.correctMark}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button 
              className={styles.pageBtn}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ← Trước
            </button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`${styles.pageNum} ${currentPage === pageNum ? styles.active : ''}`}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className={styles.pageDots}>...</span>
                  <button
                    className={styles.pageNum}
                    onClick={() => goToPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button 
              className={styles.pageBtn}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Tiếp →
            </button>
          </div>

          <div className={styles.pageInfo}>
            Trang {currentPage} / {totalPages} ({questions.length} câu hỏi)
          </div>
        </div>
      </div>
    </>
  );
};

export default LearnPage;
