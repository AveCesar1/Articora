import sys
import json
import math
from db_utils import get_db
from preprocess import preprocess

def index_source(source_id, title, authors, keywords):
    db = get_db()
    cursor = db.cursor()
    
    # 1. Crear documento virtual con pesos (título×3, autores, keywords×2)
    doc_parts = [title] * 3
    if authors:
        doc_parts.append(authors)
    if keywords:
        doc_parts.extend([keywords] * 2)
    text = ' '.join(doc_parts)
    
    # 2. Preprocesar
    terms = preprocess(text)
    
    # 3. Obtener IDF actuales de global_idf
    cursor.execute('SELECT term, idf FROM global_idf')
    idf_map = {row[0]: row[1] for row in cursor.fetchall()}
    
    # 4. Calcular TF
    total_terms = len(terms)
    tf_map = {}
    for t in terms:
        tf_map[t] = tf_map.get(t, 0) + 1
    for t in tf_map:
        tf_map[t] /= total_terms   # TF normalizado
    
    # 5. Calcular weight = tf * idf (si no existe idf, usar un valor por defecto)
    default_idf = math.log(1000)   # valor arbitrario alto
    weights = {}
    norm_sq = 0.0
    for t, tf in tf_map.items():
        idf = idf_map.get(t, default_idf)
        w = tf * idf
        weights[t] = w
        norm_sq += w * w
    norm = math.sqrt(norm_sq)
    
    # 6. Guardar en tfidf_vectors (borrar antes si ya existía)
    cursor.execute('DELETE FROM tfidf_vectors WHERE source_id = ?', (source_id,))
    for t, w in weights.items():
        tf_val = tf_map[t]
        idf_val = idf_map.get(t, default_idf)
        cursor.execute('''
            INSERT INTO tfidf_vectors (source_id, term, tf, idf, weight)
            VALUES (?, ?, ?, ?, ?)
        ''', (source_id, t, tf_val, idf_val, w))
    
    # 7. Guardar norma
    cursor.execute('DELETE FROM source_norms WHERE source_id = ?', (source_id,))
    cursor.execute('INSERT INTO source_norms (source_id, norm) VALUES (?, ?)',
                   (source_id, norm))
    
    db.commit()
    db.close()
    print(json.dumps({"status": "ok", "source_id": source_id}))

if __name__ == '__main__':
    # Esperamos argumentos: source_id, title, authors, keywords
    # authors y keywords pueden ser cadenas vacías
    _, source_id, title, authors, keywords = sys.argv
    index_source(int(source_id), title, authors, keywords)