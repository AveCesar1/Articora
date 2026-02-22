import math
from collections import defaultdict
from db_utils import get_db
from preprocess import preprocess
from index_source import index_source


def recalc_idf():
    db = get_db()
    cursor = db.cursor()
    
    # 1. Obtener todas las fuentes con sus metadatos
    cursor.execute('''
        SELECT s.id, s.title,
               GROUP_CONCAT(DISTINCT a.full_name) as authors,
               s.keywords as keywords
        FROM sources s
        LEFT JOIN source_authors sa ON s.id = sa.source_id
        LEFT JOIN authors a ON sa.author_id = a.id
        GROUP BY s.id
    ''')
    rows = cursor.fetchall()
    
    total_docs = len(rows)
    # Mapa término -> número de documentos que lo contienen
    doc_freq = defaultdict(int)
    
    for source_id, title, authors, keywords in rows:
        # reconstruir documento virtual igual que en indexación
        doc_parts = [title] * 3
        if authors:
            doc_parts.append(authors)
        if keywords:
            doc_parts.extend([keywords] * 2)
        text = ' '.join(doc_parts)
        terms = set(preprocess(text))   # términos únicos de este documento
        for t in terms:
            doc_freq[t] += 1
    
    # 2. Calcular IDF y actualizar global_idf
    cursor.execute('DELETE FROM global_idf')
    for term, freq in doc_freq.items():
        idf = math.log((total_docs or 1) / (1 + freq))
        cursor.execute('''
            INSERT INTO global_idf (term, idf, doc_freq, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (term, idf, freq))
    
    db.commit()
    
    # 3. Reindexar todas las fuentes con los nuevos IDF
    for source_id, title, authors, keywords in rows:
        # volver a calcular vector y norma
        try:
            index_source(source_id, title, authors or '', keywords or '')
        except Exception as e:
            print(f"Error reindexando fuente {source_id}: {e}")
    
    db.close()
    print("IDF recalculado y vectores actualizados")

if __name__ == '__main__':
    recalc_idf()