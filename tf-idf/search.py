import sys
import json
import math
from db_utils import get_db
from preprocess import preprocess

def search(query, top_k=20):
    db = get_db()
    cursor = db.cursor()
    
    # 1. Preprocesar consulta
    terms = preprocess(query)
    if not terms:
        return []
    
    # 2. Obtener IDF actuales
    cursor.execute('SELECT term, idf FROM global_idf')
    idf_map = {row[0]: row[1] for row in cursor.fetchall()}
    default_idf = math.log(1000)
    
    # 3. Calcular vector de consulta (TF normalizado)
    total_terms = len(terms)
    tf_map = {}
    for t in terms:
        tf_map[t] = tf_map.get(t, 0) + 1
    for t in tf_map:
        tf_map[t] /= total_terms
    
    query_vector = {}
    norm_q_sq = 0.0
    for t, tf in tf_map.items():
        idf = idf_map.get(t, default_idf)
        w = tf * idf
        query_vector[t] = w
        norm_q_sq += w * w
    norm_q = math.sqrt(norm_q_sq)
    
    if norm_q == 0:
        return []
    
    # 4. Obtener todas las normas y pesos de fuentes
    #    (Para eficiencia, podríamos iterar sobre vectores)
    cursor.execute('''
        SELECT v.source_id, v.term, v.weight, n.norm
        FROM tfidf_vectors v
        JOIN source_norms n ON v.source_id = n.source_id
    ''')
    rows = cursor.fetchall()
    
    # Agrupar por source_id
    sources = {}
    for source_id, term, weight, norm in rows:
        if source_id not in sources:
            sources[source_id] = {'norm': norm, 'vector': {}}
        sources[source_id]['vector'][term] = weight
    
    # 5. Calcular similitud de coseno con cada fuente
    results = []
    for source_id, data in sources.items():
        dot = 0.0
        for term, qw in query_vector.items():
            if term in data['vector']:
                dot += qw * data['vector'][term]
        if data['norm'] > 0:
            sim = dot / (norm_q * data['norm'])
            results.append((source_id, sim))
    
    # 6. Ordenar y tomar top_k
    results.sort(key=lambda x: x[1], reverse=True)
    top = [{'source_id': r[0], 'score': r[1]} for r in results[:top_k]]
    
    db.close()
    return top

if __name__ == '__main__':
    query = sys.argv[1] if len(sys.argv) > 1 else ''
    top = search(query)
    print(json.dumps(top))