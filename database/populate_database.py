#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para insertar datos de prueba en la base de datos Artícora
Uso: python populate_database.py
"""

import sqlite3
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

class ArticoraDataPopulator:
    def __init__(self, db_path="articora-data.db"):
        """Inicializar el poblador de datos"""
        self.db_path = db_path
        self.conn = None
        self.cursor = None
        self.reset_ids = {}
        
        # Datos de prueba predefinidos
        self.sample_users = []
        self.sample_sources = []
        self.categories = {}
        self.subcategories = {}
        
    def remove_accents(self, text):
        """Eliminar acentos de un texto"""
        import unicodedata
        return ''.join(
            c for c in unicodedata.normalize('NFD', text)
            if unicodedata.category(c) != 'Mn'
        )
    
    def connect(self):
        """Conectar a la base de datos SQLite"""
        try:
            # Crear directorio si no existe
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
            
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row
            self.cursor = self.conn.cursor()
            
            # Habilitar claves foráneas
            self.cursor.execute("PRAGMA foreign_keys = ON")
            
            print(f"✅ Conectado a la base de datos: {self.db_path}")
            return True
        except Exception as e:
            print(f"❌ Error conectando a la base de datos: {e}")
            return False
    
    def disconnect(self):
        """Desconectar de la base de datos"""
        if self.conn:
            self.conn.close()
            print("✅ Conexión cerrada")
    
    def reset_sequence(self, table_name):
        """Resetear secuencia de autoincremento para una tabla"""
        try:
            self.cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table_name}'")
            self.conn.commit()
        except Exception as e:
            print(f"⚠️ Error reseteando secuencia para {table_name}: {e}")
    
    def get_table_info(self):
        """Obtener información sobre las tablas existentes"""
        self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in self.cursor.fetchall()]
        
        print(f"📊 Tablas encontradas: {len(tables)}")
        for table in tables:
            self.cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = self.cursor.fetchone()[0]
            print(f"  {table}: {count} registros")
        
        return tables
    
    def load_existing_ids(self):
        """Cargar IDs existentes para referencias"""
        # Categorías
        self.cursor.execute("SELECT id, name FROM categories")
        self.categories = {row['name']: row['id'] for row in self.cursor.fetchall()}
        
        # Subcategorías
        self.cursor.execute("SELECT id, name FROM subcategories")
        self.subcategories = {row['name']: row['id'] for row in self.cursor.fetchall()}
        
        # Tipos de fuente
        self.cursor.execute("SELECT id, name FROM source_types")
        self.source_types = {row['name']: row['id'] for row in self.cursor.fetchall()}
        
        print(f"📝 IDs cargados: {len(self.categories)} categorías, {len(self.subcategories)} subcategorías, {len(self.source_types)} tipos de fuente")
    
    def create_sample_users(self, count=20):
        """Crear usuarios de prueba"""
        print(f"\n👤 Creando {count} usuarios de prueba...")
        
        # Datos de usuarios de prueba (sin acentos)
        first_names = ['Ana', 'Carlos', 'Maria', 'Jose', 'Laura', 'Miguel', 'Sofia', 'David', 
                      'Elena', 'Jorge', 'Carmen', 'Francisco', 'Patricia', 'Antonio', 'Isabel',
                      'Roberto', 'Lucia', 'Daniel', 'Paula', 'Javier']
        
        last_names = ['Garcia', 'Rodriguez', 'Gonzalez', 'Fernandez', 'Lopez', 'Martinez', 
                     'Sanchez', 'Perez', 'Gomez', 'Martin', 'Jimenez', 'Ruiz', 'Hernandez',
                     'Diaz', 'Moreno', 'Munoz', 'Alvarez', 'Romero', 'Alonso', 'Navarro']
        
        domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'unam.mx', 'tec.mx']
        academic_levels = ['Bachelor', 'Masters', 'PhD']
        universities = ['UNAM', 'IPN', 'Tec de Monterrey', 'UAM', 'UANL', 'UDG', 'UV', 'UABC']
        
        for i in range(count):
            first = random.choice(first_names)
            last = random.choice(last_names)
            
            # Eliminar acentos por si acaso
            first_clean = self.remove_accents(first)
            last_clean = self.remove_accents(last)
            
            username = f"{first_clean.lower()}.{last_clean.lower()}{i}"
            
            # Asegurar que el username tenga entre 5 y 15 caracteres
            if len(username) < 5:
                username = username + "user"
            if len(username) > 15:
                username = username[:15]
            
            email = f"{username}@{random.choice(domains)}"
            
            # Datos del usuario
            user_data = {
                'username': username,
                'email': email,
                'password': '$2b$12$' + 'x' * 53,  # Hash bcrypt dummy
                'profile_picture': f"https://randomuser.me/api/portraits/{'men' if i % 2 == 0 else 'women'}/{i % 50}.jpg",
                'bio': f"Investigador en {random.choice(['Ciencias', 'Humanidades', 'Ingenieria'])}. Especializado en {random.choice(['IA', 'Literatura', 'Biologia', 'Fisica'])}.",
                'available_for_messages': random.choice([0, 1]),
                'academic_level': random.choice(academic_levels),
                'is_validated': random.choice([0, 1]),
                'is_verified': random.choice([0, 1]),
                'last_login': (datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d %H:%M:%S'),
                'login_attempts': random.randint(0, 2),
                'account_active': 1
            }
            
            try:
                self.cursor.execute('''
                    INSERT INTO users (username, email, password, profile_picture, bio, 
                                      available_for_messages, academic_level, is_validated, 
                                      is_verified, last_login, login_attempts, account_active)
                    VALUES (:username, :email, :password, :profile_picture, :bio,
                            :available_for_messages, :academic_level, :is_validated,
                            :is_verified, :last_login, :login_attempts, :account_active)
                ''', user_data)
                
                user_id = self.cursor.lastrowid
                self.sample_users.append({
                    'id': user_id,
                    'username': username,
                    'academic_level': user_data['academic_level'],
                    'is_validated': user_data['is_validated']
                })
                
                # Crear algunas validaciones para usuarios validados
                if user_data['is_validated'] == 1 and random.random() > 0.5:
                    validation_type = random.choice(['license', 'certificate'])
                    self.cursor.execute('''
                        INSERT INTO user_validations (user_id, validation_type, status, submitted_at, resolved_at)
                        VALUES (?, ?, 'approved', datetime('now', '-10 days'), datetime('now', '-5 days'))
                    ''', (user_id, validation_type))
                
            except sqlite3.IntegrityError as e:
                print(f"  ⚠️ Usuario duplicado {username}: {e}")
                # Si hay duplicado, intentar con un número diferente
                username = f"{first_clean.lower()}.{last_clean.lower()}{i+100}"
                user_data['username'] = username
                user_data['email'] = f"{username}@{random.choice(domains)}"
                
                try:
                    self.cursor.execute('''
                        INSERT INTO users (username, email, password, profile_picture, bio, 
                                          available_for_messages, academic_level, is_validated, 
                                          is_verified, last_login, login_attempts, account_active)
                        VALUES (:username, :email, :password, :profile_picture, :bio,
                                :available_for_messages, :academic_level, :is_validated,
                                :is_verified, :last_login, :login_attempts, :account_active)
                    ''', user_data)
                    
                    user_id = self.cursor.lastrowid
                    self.sample_users.append({
                        'id': user_id,
                        'username': username,
                        'academic_level': user_data['academic_level'],
                        'is_validated': user_data['is_validated']
                    })
                    
                except sqlite3.IntegrityError as e2:
                    print(f"  ⚠️ Segundo intento fallido para {username}: {e2}")
                    continue
        
        self.conn.commit()
        print(f"✅ {len(self.sample_users)} usuarios creados")
        return self.sample_users
    
    def create_sample_sources(self, count=50):
        """Crear fuentes bibliográficas de prueba"""
        print(f"\n📚 Creando {count} fuentes bibliográficas de prueba...")
        
        # Títulos de ejemplo por categoría
        source_titles = {
            'Cognitive Sciences': [
                'Cognitive Load Theory and Its Applications in Education',
                'Neural Correlates of Decision Making',
                'Language Acquisition in Bilingual Children',
                'Memory Consolidation During Sleep',
                'Attention Mechanisms in Visual Processing'
            ],
            'Social Sciences': [
                'Social Networks and Political Mobilization',
                'Economic Inequality in Developing Countries',
                'Cultural Identity in Globalization',
                'Gender Roles in Modern Society',
                'Urban Sociology: Megacities Challenges'
            ],
            'Humanities': [
                'Philosophy of Mind: Consciousness Studies',
                'Postmodern Literature Analysis',
                'Ethical Implications of Artificial Intelligence',
                'Historical Narratives and National Identity',
                'Aesthetic Theory in Contemporary Art'
            ],
            'Computational Sciences': [
                'Deep Learning Architectures for Natural Language Processing',
                'Cybersecurity Threats in IoT Devices',
                'Quantum Computing Algorithms',
                'Software Engineering Best Practices for Agile Teams',
                'Data Visualization Techniques for Big Data'
            ],
            'Natural Sciences': [
                'Climate Change Impact on Marine Ecosystems',
                'CRISPR Technology in Genetic Engineering',
                'Dark Matter and Universe Expansion',
                'Nanomaterials for Renewable Energy',
                'Evolutionary Biology: Speciation Mechanisms'
            ],
            'Applied Sciences': [
                'Sustainable Architecture in Urban Design',
                'Medical Imaging Advances in Oncology',
                'Renewable Energy Systems Integration',
                'Biomaterials for Tissue Engineering',
                'Structural Engineering for Earthquake Resistance'
            ]
        }
        
        # Autores académicos ficticios
        academic_authors = [
            'Smith, J., Johnson, R., Williams, A.',
            'Garcia, M., Rodriguez, P., Martinez, L.',
            'Chen, W., Wang, L., Zhang, Y.',
            'Muller, H., Schmidt, K., Fischer, T.',
            'Dubois, P., Lefevre, C., Moreau, J.',
            'Silva, R., Santos, M., Oliveira, A.',
            'Ivanov, A., Petrov, D., Sidorov, M.',
            'Yamamoto, T., Tanaka, H., Suzuki, K.'
        ]
        
        # Revistas y editoriales
        journals = [
            'Nature', 'Science', 'PNAS', 'Cell', 'The Lancet',
            'IEEE Transactions', 'ACM Computing Surveys',
            'Psychological Review', 'American Economic Review',
            'Journal of Biological Chemistry', 'Physical Review Letters'
        ]
        
        # URLs de acceso (simuladas)
        base_urls = [
            'https://doi.org/10.1000/',
            'https://arxiv.org/abs/',
            'https://www.ncbi.nlm.nih.gov/pmc/articles/',
            'https://ieeexplore.ieee.org/document/',
            'https://link.springer.com/article/'
        ]
        
        # Mapeo de categorías a IDs
        category_map = {
            'Cognitive Sciences': 1,
            'Social Sciences': 2,
            'Humanities': 3,
            'Creative Disciplines': 4,
            'Computational Sciences': 5,
            'Exact Sciences': 6,
            'Natural Sciences': 7,
            'Applied Sciences': 8
        }
        
        # Mapeo de tipos de fuente
        source_type_map = {
            'Book': 1,
            'Book Chapter': 2,
            'Journal Article': 3,
            'Preprint': 4,
            'Thesis or Dissertation': 5,
            'Online Article': 6,
            'Conference Proceedings': 7,
            'Technical Report': 8,
            'Encyclopedia or Dictionary': 9,
            'Audiovisual Material': 10
        }
        
        for i in range(count):
            # Seleccionar categoría aleatoria
            category_name = random.choice(list(category_map.keys()))
            category_id = category_map[category_name]
            
            # Seleccionar título apropiado
            if category_name in source_titles:
                title = random.choice(source_titles[category_name])
            else:
                title = f"Research in {category_name}: Volume {i+1}"
            
            # Crear datos de la fuente
            source_data = {
                'title': title + f" (Part {i % 5 + 1})",
                'authors': random.choice(academic_authors),
                'publication_year': random.randint(2010, 2024),
                'journal_publisher': random.choice(journals),
                'volume': str(random.randint(1, 50)),
                'issue_number': random.randint(1, 12),
                'pages': f"{random.randint(1, 50)}-{random.randint(51, 100)}",
                'edition': random.randint(1, 5) if random.random() > 0.7 else None,
                'source_type_id': random.choice([1, 2, 3, 6, 7]),  # Tipos más comunes
                'doi': f"10.1000/xyz{i:06d}",
                'keywords': json.dumps([category_name.lower(), 'research', 'academic', 'study']),
                'primary_url': random.choice(base_urls) + f"xyz{i:06d}",
                'category_id': category_id,
                'subcategory_id': random.choice([1, 2, 3, 4, 5]),  # Subcategorías básicas
                'uploaded_by': random.choice(self.sample_users)['id'] if self.sample_users else 1,
                'cover_image_url': f"https://picsum.photos/300/400?random={i}",
                'is_active': 1,
                'total_reads': random.randint(0, 500),
                'total_ratings': 0,  # Se actualizará después
                'overall_rating': 0   # Se calculará después
            }
            
            try:
                self.cursor.execute('''
                    INSERT INTO sources (
                        title, authors, publication_year, journal_publisher, volume, 
                        issue_number, pages, edition, source_type_id, doi, keywords,
                        primary_url, category_id, subcategory_id, uploaded_by,
                        cover_image_url, is_active, total_reads, total_ratings, overall_rating
                    ) VALUES (
                        :title, :authors, :publication_year, :journal_publisher, :volume,
                        :issue_number, :pages, :edition, :source_type_id, :doi, :keywords,
                        :primary_url, :category_id, :subcategory_id, :uploaded_by,
                        :cover_image_url, :is_active, :total_reads, :total_ratings, :overall_rating
                    )
                ''', source_data)
                
                source_id = self.cursor.lastrowid
                self.sample_sources.append({
                    'id': source_id,
                    'title': source_data['title'],
                    'category_id': category_id,
                    'uploaded_by': source_data['uploaded_by']
                })
                
                # Crear URLs secundarias para algunas fuentes
                if random.random() > 0.6:
                    for url_type in ['secondary', 'purchase']:
                        self.cursor.execute('''
                            INSERT INTO source_urls (source_id, url, url_type)
                            VALUES (?, ?, ?)
                        ''', (source_id, f"https://alternate.source/{source_id}/{url_type}", url_type))
                
            except Exception as e:
                print(f"  ⚠️ Error creando fuente {i}: {e}")
                continue
        
        self.conn.commit()
        print(f"✅ {len(self.sample_sources)} fuentes creadas")
        return self.sample_sources
    
    def create_sample_ratings(self):
        """Crear calificaciones y comentarios de prueba"""
        if not self.sample_sources or not self.sample_users:
            print("⚠️ Necesitas crear usuarios y fuentes primero")
            return
        
        print(f"\n⭐ Creando calificaciones y comentarios de prueba...")
        
        rating_count = 0
        comment_count = 0
        
        for source in self.sample_sources:
            # Número de calificaciones por fuente (0-10)
            num_ratings = random.randint(0, 10)
            
            # Seleccionar usuarios aleatorios para calificar esta fuente
            rating_users = random.sample(self.sample_users, min(num_ratings, len(self.sample_users)))
            
            for user in rating_users:
                # Crear calificación
                rating_data = {
                    'source_id': source['id'],
                    'user_id': user['id'],
                    'readability': round(random.uniform(2.0, 5.0) * 2) / 2,  # Múltiplos de 0.5
                    'completeness': round(random.uniform(2.0, 5.0) * 2) / 2,
                    'detail_level': round(random.uniform(2.0, 5.0) * 2) / 2,
                    'veracity': round(random.uniform(3.0, 5.0) * 2) / 2,
                    'technical_difficulty': round(random.uniform(1.0, 5.0) * 2) / 2,
                    'comment': None,
                    'academic_context': user['academic_level'],
                    'created_at': (datetime.now() - timedelta(days=random.randint(0, 60))).strftime('%Y-%m-%d %H:%M:%S')
                }
                
                # Calcular promedio
                avg_rating = sum([
                    rating_data['readability'],
                    rating_data['completeness'],
                    rating_data['detail_level'],
                    rating_data['veracity'],
                    rating_data['technical_difficulty']
                ]) / 5
                
                # Agregar comentario en el 40% de las calificaciones
                if random.random() > 0.6:
                    comments = [
                        "Excelente recurso para entender los conceptos basicos.",
                        "Muy completo, pero podria profundizar mas en algunos temas.",
                        "La bibliografia es extensa y actualizada.",
                        "Buen punto de partida para investigacion en el area.",
                        "La metodologia es solida y los resultados son convincentes.",
                        "Recomendado para estudiantes de posgrado.",
                        "El lenguaje es claro y accesible.",
                        "Falta discusion sobre aplicaciones practicas."
                    ]
                    rating_data['comment'] = random.choice(comments)
                    comment_count += 1
                
                try:
                    self.cursor.execute('''
                        INSERT INTO ratings (
                            source_id, user_id, readability, completeness, detail_level,
                            veracity, technical_difficulty, comment, academic_context, created_at
                        ) VALUES (
                            :source_id, :user_id, :readability, :completeness, :detail_level,
                            :veracity, :technical_difficulty, :comment, :academic_context, :created_at
                        )
                    ''', rating_data)
                    
                    rating_count += 1
                    
                    # Crear historial de calificación (versiones anteriores)
                    if random.random() > 0.8:
                        rating_id = self.cursor.lastrowid
                        self.cursor.execute('''
                            INSERT INTO rating_history (
                                rating_id, readability, completeness, detail_level,
                                veracity, technical_difficulty, academic_context, comment
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            rating_id,
                            max(1.0, rating_data['readability'] - 0.5),
                            max(1.0, rating_data['completeness'] - 0.5),
                            max(1.0, rating_data['detail_level'] - 0.5),
                            max(1.0, rating_data['veracity'] - 0.5),
                            max(1.0, rating_data['technical_difficulty'] - 0.5),
                            rating_data['academic_context'],
                            "Version anterior de la calificacion"
                        ))
                
                except Exception as e:
                    if "UNIQUE constraint" in str(e):
                        continue  # Usuario ya calificó esta fuente
                    print(f"  ⚠️ Error creando calificacion: {e}")
        
        # Actualizar promedios en las fuentes
        self.update_source_ratings()
        
        self.conn.commit()
        print(f"✅ {rating_count} calificaciones creadas ({comment_count} con comentarios)")
    
    def update_source_ratings(self):
        """Actualizar promedios de calificación en las fuentes"""
        print("📊 Actualizando promedios de calificacion...")
        
        self.cursor.execute('''
            SELECT source_id, 
                   COUNT(*) as total_ratings,
                   AVG(readability) as avg_readability,
                   AVG(completeness) as avg_completeness,
                   AVG(detail_level) as avg_detail_level,
                   AVG(veracity) as avg_veracity,
                   AVG(technical_difficulty) as avg_technical_difficulty
            FROM ratings
            GROUP BY source_id
        ''')
        
        for row in self.cursor.fetchall():
            overall = sum([
                row['avg_readability'] or 0,
                row['avg_completeness'] or 0,
                row['avg_detail_level'] or 0,
                row['avg_veracity'] or 0,
                row['avg_technical_difficulty'] or 0
            ]) / 5
            
            self.cursor.execute('''
                UPDATE sources 
                SET total_ratings = ?,
                    avg_readability = ?,
                    avg_completeness = ?,
                    avg_detail_level = ?,
                    avg_veracity = ?,
                    avg_technical_difficulty = ?,
                    overall_rating = ?
                WHERE id = ?
            ''', (
                row['total_ratings'],
                row['avg_readability'] or 0,
                row['avg_completeness'] or 0,
                row['avg_detail_level'] or 0,
                row['avg_veracity'] or 0,
                row['avg_technical_difficulty'] or 0,
                overall,
                row['source_id']
            ))
        
        self.conn.commit()
    
    def create_sample_lists(self):
        """Crear listas curatoriales de prueba"""
        if not self.sample_users or not self.sample_sources:
            print("⚠️ Necesitas crear usuarios y fuentes primero")
            return
        
        print(f"\n📋 Creando listas curatoriales de prueba...")
        
        list_themes = [
            "Fundamentos de Inteligencia Artificial",
            "Literatura Latinoamericana Contemporanea",
            "Cambio Climatico y Sustentabilidad",
            "Neurociencia Cognitiva Avanzada",
            "Historia de las Revoluciones",
            "Filosofia del Lenguaje",
            "Ingenieria de Software Moderna",
            "Biologia Molecular Basica"
        ]
        
        list_descriptions = [
            "Recursos esenciales para comprender los conceptos fundamentales.",
            "Obras representativas de los autores mas influyentes.",
            "Investigaciones sobre impacto ambiental y soluciones sostenibles.",
            "Estudios recientes sobre procesos cognitivos y neurologicos.",
            "Analisis historico de movimientos revolucionarios mundiales.",
            "Textos filosoficos sobre el lenguaje y la comunicacion.",
            "Mejores practicas y metodologias actuales.",
            "Introduccion a los principios de la biologia molecular."
        ]
        
        list_count = 0
        source_in_list_count = 0
        
        for i, theme in enumerate(list_themes):
            # Seleccionar usuario creador
            creator = random.choice(self.sample_users)
            
            # Crear lista
            list_data = {
                'user_id': creator['id'],
                'title': theme,
                'description': list_descriptions[i % len(list_descriptions)],
                'cover_image': f"https://picsum.photos/400/300?random={i+100}",
                'is_public': random.choice([0, 1]),
                'is_collaborative': random.choice([0, 1]),
                'total_sources': 0,
                'total_views': random.randint(0, 1000)
            }
            
            try:
                self.cursor.execute('''
                    INSERT INTO curatorial_lists (
                        user_id, title, description, cover_image, is_public,
                        is_collaborative, total_sources, total_views
                    ) VALUES (
                        :user_id, :title, :description, :cover_image, :is_public,
                        :is_collaborative, :total_sources, :total_views
                    )
                ''', list_data)
                
                list_id = self.cursor.lastrowid
                list_count += 1
                
                # Agregar fuentes a la lista (5-15 fuentes por lista)
                num_sources = random.randint(5, 15)
                list_sources = random.sample(self.sample_sources, min(num_sources, len(self.sample_sources)))
                
                for order, source in enumerate(list_sources):
                    self.cursor.execute('''
                        INSERT INTO list_sources (list_id, source_id, sort_order)
                        VALUES (?, ?, ?)
                    ''', (list_id, source['id'], order))
                    source_in_list_count += 1
                
                # Actualizar conteo de fuentes en la lista
                self.cursor.execute('''
                    UPDATE curatorial_lists 
                    SET total_sources = ?
                    WHERE id = ?
                ''', (len(list_sources), list_id))
                
                # Agregar colaboradores para listas colaborativas
                if list_data['is_collaborative'] == 1:
                    collaborators = random.sample(
                        [u for u in self.sample_users if u['id'] != creator['id']],
                        min(3, len(self.sample_users) - 1)
                    )
                    
                    for collab in collaborators:
                        self.cursor.execute('''
                            INSERT INTO list_collaborators (list_id, user_id, status)
                            VALUES (?, ?, ?)
                        ''', (list_id, collab['id'], random.choice(['pending', 'accepted'])))
                
            except Exception as e:
                print(f"  ⚠️ Error creando lista: {e}")
                continue
        
        self.conn.commit()
        print(f"✅ {list_count} listas creadas con {source_in_list_count} fuentes incluidas")
    
    def create_sample_readings(self):
        """Crear registros de lectura de prueba"""
        if not self.sample_users or not self.sample_sources:
            print("⚠️ Necesitas crear usuarios y fuentes primero")
            return
        
        print(f"\n📖 Creando registros de lectura de prueba...")
        
        reading_count = 0
        
        for user in self.sample_users:
            # Cada usuario lee entre 5 y 20 fuentes
            user_sources = random.sample(self.sample_sources, random.randint(5, min(20, len(self.sample_sources))))
            
            for source in user_sources:
                # Decidir si la fuente está leída o en lista de lectura
                status = random.choice(['read', 'to_read'])
                read_date = None
                priority = 0
                
                if status == 'read':
                    read_date = (datetime.now() - timedelta(days=random.randint(0, 90))).strftime('%Y-%m-%d')
                else:
                    priority = random.randint(1, 10)
                
                try:
                    self.cursor.execute('''
                        INSERT OR IGNORE INTO user_readings 
                        (user_id, source_id, status, read_date, priority)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (user['id'], source['id'], status, read_date, priority))
                    
                    if self.cursor.rowcount > 0:
                        reading_count += 1
                
                except Exception as e:
                    print(f"  ⚠️ Error creando registro de lectura: {e}")
        
        # Actualizar estadísticas de lectura
        self.update_reading_stats()
        
        self.conn.commit()
        print(f"✅ {reading_count} registros de lectura creados")
    
    def update_reading_stats(self):
        """Actualizar estadísticas de lectura"""
        print("📈 Actualizando estadisticas de lectura...")
        
        for user in self.sample_users:
            # Contar lecturas por usuario
            self.cursor.execute('''
                SELECT 
                    COUNT(CASE WHEN status = 'read' THEN 1 END) as total_read,
                    COUNT(CASE WHEN status = 'to_read' THEN 1 END) as total_to_read
                FROM user_readings 
                WHERE user_id = ?
            ''', (user['id'],))
            
            stats = self.cursor.fetchone()
            
            # Calcular distribución por categoría (simplificada)
            distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0}
            
            self.cursor.execute('''
                SELECT s.category_id, COUNT(*) as count
                FROM user_readings ur
                JOIN sources s ON ur.source_id = s.id
                WHERE ur.user_id = ? AND ur.status = 'read'
                GROUP BY s.category_id
            ''', (user['id'],))
            
            for row in self.cursor.fetchall():
                distribution[str(row['category_id'])] = row['count']
            
            # Insertar o actualizar estadísticas
            self.cursor.execute('''
                INSERT OR REPLACE INTO reading_stats 
                (user_id, total_read, total_to_read, category_distribution)
                VALUES (?, ?, ?, ?)
            ''', (user['id'], stats['total_read'], stats['total_to_read'], json.dumps(distribution)))
        
        self.conn.commit()
    
    def create_sample_contacts(self):
        """Crear contactos y solicitudes de prueba"""
        if not self.sample_users:
            print("⚠️ Necesitas crear usuarios primero")
            return
        
        print(f"\n👥 Creando contactos y solicitudes de prueba...")
        
        contact_count = 0
        request_count = 0
        
        # Crear algunas solicitudes de contacto
        for _ in range(15):
            sender, receiver = random.sample(self.sample_users, 2)
            
            messages = [
                "Hola, me interesa tu trabajo en investigacion.",
                "Nos vimos en la conferencia, ¿podemos conectar?",
                "Me gustaria colaborar en un proyecto relacionado.",
                "¿Podrias revisar mi articulo sobre el tema?",
                "Busco asesoria en esta area de estudio."
            ]
            
            request_data = {
                'sender_id': sender['id'],
                'receiver_id': receiver['id'],
                'initial_message': random.choice(messages),
                'status': random.choice(['pending', 'accepted', 'rejected']),
                'sent_at': (datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d %H:%M:%S'),
                'responded_at': None
            }
            
            if request_data['status'] != 'pending':
                request_data['responded_at'] = (datetime.now() - timedelta(days=random.randint(0, 15))).strftime('%Y-%m-%d %H:%M:%S')
            
            try:
                self.cursor.execute('''
                    INSERT OR IGNORE INTO contact_requests 
                    (sender_id, receiver_id, initial_message, status, sent_at, responded_at)
                    VALUES (:sender_id, :receiver_id, :initial_message, :status, :sent_at, :responded_at)
                ''', request_data)
                
                if self.cursor.rowcount > 0:
                    request_count += 1
                    
                    # Si fue aceptada, crear contacto confirmado
                    if request_data['status'] == 'accepted':
                        user_ids = sorted([sender['id'], receiver['id']])
                        self.cursor.execute('''
                            INSERT OR IGNORE INTO confirmed_contacts 
                            (user_id_1, user_id_2)
                            VALUES (?, ?)
                        ''', (user_ids[0], user_ids[1]))
                        
                        if self.cursor.rowcount > 0:
                            contact_count += 1
            
            except Exception as e:
                if "UNIQUE constraint" in str(e):
                    continue
                print(f"  ⚠️ Error creando solicitud de contacto: {e}")
        
        self.conn.commit()
        print(f"✅ {request_count} solicitudes creadas, {contact_count} contactos confirmados")
    
    def create_sample_chats(self):
        """Crear chats y mensajes de prueba"""
        if not self.sample_users:
            print("⚠️ Necesitas crear usuarios primero")
            return
        
        print(f"\n💬 Creando chats y mensajes de prueba...")
        
        # Crear algunos chats individuales
        chat_count = 0
        message_count = 0
        
        # Usar algunos contactos confirmados para chats
        self.cursor.execute('SELECT user_id_1, user_id_2 FROM confirmed_contacts LIMIT 10')
        contacts = self.cursor.fetchall()
        
        for contact in contacts:
            # Crear chat individual
            self.cursor.execute('''
                INSERT INTO chats (chat_type, created_at)
                VALUES ('private', datetime('now', ?))
            ''', (f"-{random.randint(1, 30)} days",))
            
            chat_id = self.cursor.lastrowid
            chat_count += 1
            
            # Agregar participantes
            self.cursor.execute('''
                INSERT INTO chat_participants (chat_id, user_id, joined_at)
                VALUES (?, ?, datetime('now', ?))
            ''', (chat_id, contact['user_id_1'], f"-{random.randint(1, 30)} days"))
            
            self.cursor.execute('''
                INSERT INTO chat_participants (chat_id, user_id, joined_at)
                VALUES (?, ?, datetime('now', ?))
            ''', (chat_id, contact['user_id_2'], f"-{random.randint(1, 30)} days"))
            
            # Crear algunos mensajes en el chat
            sample_messages = [
                "Hola, ¿como estas?",
                "He estado revisando tu ultima publicacion, muy interesante.",
                "¿Podriamos programar una reunion para discutir el proyecto?",
                "Te envio el borrador del articulo para que lo revises.",
                "¿Que opinas sobre el ultimo estudio que publicaron?",
                "Gracias por la retroalimentacion, fue muy util.",
                "Nos vemos en la conferencia la proxima semana."
            ]
            
            num_messages = random.randint(3, 10)
            last_message_at = None
            
            for i in range(num_messages):
                sender = random.choice([contact['user_id_1'], contact['user_id_2']])
                message = random.choice(sample_messages)
                sent_offset = f"-{random.randint(0, 30*24*60)} minutes"  # Últimos 30 días
                
                self.cursor.execute('''
                    INSERT INTO messages (chat_id, user_id, encrypted_content, iv, sent_at)
                    VALUES (?, ?, ?, ?, datetime('now', ?))
                ''', (chat_id, sender, f"encrypted_{message}", "iv_data", sent_offset))
                
                message_count += 1
                last_message_at = sent_offset
            
            # Actualizar última fecha de mensaje del chat
            if last_message_at:
                self.cursor.execute('''
                    UPDATE chats 
                    SET last_message_at = datetime('now', ?)
                    WHERE id = ?
                ''', (last_message_at, chat_id))
        
        self.conn.commit()
        print(f"✅ {chat_count} chats creados con {message_count} mensajes")
    
    def create_sample_reports(self):
        """Crear reportes de prueba"""
        if not self.sample_users or not self.sample_sources:
            print("⚠️ Necesitas crear usuarios y fuentes primero")
            return
        
        print(f"\n⚠️ Creando reportes de prueba...")
        
        report_count = 0
        
        for _ in range(10):
            reporter = random.choice(self.sample_users)
            report_type = random.choice(['source', 'user'])
            
            # Definir reason primero
            reason = random.choice(['spam', 'inappropriate_content', 'false_information', 'harassment'])
            
            report_data = {
                'report_type': report_type,
                'reporter_id': reporter['id'],
                'source_id': None,
                'reported_user_id': None,
                'reason': reason,
                'description': f"Reporte de prueba por {reason}",
                'status': random.choice(['pending', 'reviewed', 'resolved']),
                'reported_at': (datetime.now() - timedelta(days=random.randint(0, 15))).strftime('%Y-%m-%d %H:%M:%S'),
                'reviewed_at': None,
                'resolved_at': None,
                'admin_id': None,
                'action_taken': None
            }
            
            if report_type == 'source':
                source = random.choice(self.sample_sources)
                report_data['source_id'] = source['id']
            else:
                reported = random.choice([u for u in self.sample_users if u['id'] != reporter['id']])
                report_data['reported_user_id'] = reported['id']
            
            if report_data['status'] != 'pending':
                report_data['reviewed_at'] = (datetime.now() - timedelta(days=random.randint(0, 10))).strftime('%Y-%m-%d %H:%M:%S')
                
                # Solo asignar admin_id si hay usuarios validados
                validated_users = [u['id'] for u in self.sample_users if u.get('is_validated') == 1]
                if validated_users:
                    report_data['admin_id'] = random.choice(validated_users)
                
                if report_data['status'] == 'resolved':
                    report_data['resolved_at'] = (datetime.now() - timedelta(days=random.randint(0, 5))).strftime('%Y-%m-%d %H:%M:%S')
                    report_data['action_taken'] = random.choice(['warning_issued', 'content_removed', 'account_suspended', 'no_action'])
            
            try:
                self.cursor.execute('''
                    INSERT INTO reports (
                        report_type, reporter_id, source_id, reported_user_id,
                        reason, description, status, reported_at, reviewed_at,
                        resolved_at, admin_id, action_taken
                    ) VALUES (
                        :report_type, :reporter_id, :source_id, :reported_user_id,
                        :reason, :description, :status, :reported_at, :reviewed_at,
                        :resolved_at, :admin_id, :action_taken
                    )
                ''', report_data)
                
                report_count += 1
            
            except Exception as e:
                print(f"  ⚠️ Error creando reporte: {e}")
        
        self.conn.commit()
        print(f"✅ {report_count} reportes creados")
    
    def create_tfidf_sample_data(self):
        """Crear datos de ejemplo para TF-IDF"""
        if not self.sample_sources:
            print("⚠️ Necesitas crear fuentes primero")
            return
        
        print(f"\n🔍 Creando datos de ejemplo para TF-IDF...")
        
        # Términos comunes por categoría
        category_terms = {
            1: ['cognicion', 'aprendizaje', 'memoria', 'neurociencia', 'psicologia'],
            2: ['sociedad', 'economia', 'politica', 'cultura', 'historia'],
            3: ['filosofia', 'literatura', 'etica', 'lenguaje', 'arte'],
            5: ['computacion', 'algoritmo', 'software', 'datos', 'inteligencia'],
            7: ['biologia', 'quimica', 'ecologia', 'evolucion', 'genetica'],
            8: ['ingenieria', 'medicina', 'tecnologia', 'diseno', 'materiales']
        }
        
        vector_count = 0
        
        for source in self.sample_sources:
            category_id = source['category_id']
            
            if category_id in category_terms:
                terms = category_terms[category_id]
                
                # Agregar algunos términos específicos
                extra_terms = ['investigacion', 'estudio', 'analisis', 'metodo', 'resultado']
                all_terms = terms + random.sample(extra_terms, 2)
                
                for term in all_terms:
                    # Valores TF-IDF simulados
                    tf = round(random.uniform(0.1, 1.0), 3)
                    idf = round(random.uniform(1.0, 3.0), 3)
                    weight = round(tf * idf, 3)
                    
                    try:
                        self.cursor.execute('''
                            INSERT OR IGNORE INTO tfidf_vectors (source_id, term, tf, idf, weight)
                            VALUES (?, ?, ?, ?, ?)
                        ''', (source['id'], term, tf, idf, weight))
                        
                        if self.cursor.rowcount > 0:
                            vector_count += 1
                    
                    except Exception as e:
                        print(f"  ⚠️ Error creando vector TF-IDF: {e}")
        
        self.conn.commit()
        print(f"✅ {vector_count} vectores TF-IDF creados")
    
    def create_autocomplete_data(self):
        """Crear datos para autocompletado"""
        print(f"\n🔤 Creando datos para autocompletado...")
        
        # Palabras comunes en español para autocompletado
        common_words = [
            'investigacion', 'estudio', 'analisis', 'metodo', 'teoria',
            'sistema', 'proceso', 'estructura', 'funcion', 'modelo',
            'desarrollo', 'aplicacion', 'evaluacion', 'resultado', 'conclusion',
            'perspectiva', 'enfoque', 'contexto', 'aspecto', 'elemento'
        ]
        
        # Nombres de autores comunes
        author_names = ['Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez',
                       'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Cruz']
        
        # Nombres de revistas
        journals = ['Nature', 'Science', 'Journal', 'Review', 'Proceedings',
                   'Transactions', 'Bulletin', 'Letters', 'Research', 'Studies']
        
        word_count = 0
        
        # Palabras para títulos
        for word in common_words:
            self.cursor.execute('''
                INSERT OR IGNORE INTO autocomplete_dictionary (language, word, field, frequency)
                VALUES ('es', ?, 'title', ?)
            ''', (word, random.randint(10, 100)))
            word_count += 1
        
        # Nombres para autores
        for author in author_names:
            self.cursor.execute('''
                INSERT OR IGNORE INTO autocomplete_dictionary (language, word, field, frequency)
                VALUES ('es', ?, 'author', ?)
            ''', (author, random.randint(5, 50)))
            word_count += 1
        
        # Palabras para editoriales/revistas
        for journal in journals:
            self.cursor.execute('''
                INSERT OR IGNORE INTO autocomplete_dictionary (language, word, field, frequency)
                VALUES ('en', ?, 'publisher', ?)
            ''', (journal, random.randint(3, 30)))
            word_count += 1
        
        # Palabras clave comunes
        keywords = ['ciencia', 'tecnologia', 'educacion', 'salud', 'medio ambiente',
                   'economia', 'sociedad', 'cultura', 'politica', 'historia']
        
        for keyword in keywords:
            self.cursor.execute('''
                INSERT OR IGNORE INTO autocomplete_dictionary (language, word, field, frequency)
                VALUES ('es', ?, 'keyword', ?)
            ''', (keyword, random.randint(15, 80)))
            word_count += 1
        
        self.conn.commit()
        print(f"✅ {word_count} palabras para autocompletado creadas")
    
    def populate_all(self):
        """Poblar toda la base de datos con datos de prueba"""
        print("🚀 Iniciando poblacion de base de datos Articora...")
        
        # Paso 1: Verificar conexión
        if not self.connect():
            return
        
        # Paso 2: Cargar IDs existentes
        self.load_existing_ids()
        
        # Paso 3: Crear datos en orden
        self.create_sample_users(20)
        self.create_sample_sources(50)
        self.create_sample_ratings()
        self.create_sample_lists()
        self.create_sample_readings()
        self.create_sample_contacts()
        self.create_sample_chats()
        self.create_sample_reports()
        self.create_tfidf_sample_data()
        self.create_autocomplete_data()
        
        # Paso 4: Mostrar resumen final
        self.show_summary()
        
        # Paso 5: Desconectar
        self.disconnect()
    
    def show_summary(self):
        """Mostrar resumen de datos insertados"""
        print("\n" + "="*50)
        print("📊 RESUMEN DE DATOS INSERTADOS")
        print("="*50)
        
        tables_to_check = [
            'users', 'sources', 'ratings', 'curatorial_lists', 
            'list_sources', 'user_readings', 'contact_requests',
            'confirmed_contacts', 'chats', 'messages', 'reports',
            'tfidf_vectors', 'autocomplete_dictionary'
        ]
        
        total_records = 0
        for table in tables_to_check:
            try:
                self.cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                count = self.cursor.fetchone()['count']
                print(f"  {table:25} {count:6} registros")
                total_records += count
            except:
                print(f"  {table:25} No existe")
        
        print("-"*50)
        print(f"  {'TOTAL':25} {total_records:6} registros")
        print("="*50)
        
        # Mostrar algunas estadísticas
        print("\n📈 ESTADISTICAS ADICIONALES:")
        
        # Usuarios validados vs no validados
        self.cursor.execute("SELECT is_validated, COUNT(*) FROM users GROUP BY is_validated")
        for row in self.cursor.fetchall():
            status = "Validados" if row['is_validated'] == 1 else "No validados"
            print(f"  Usuarios {status}: {row['COUNT(*)']}")
        
        # Fuentes por categoría
        self.cursor.execute('''
            SELECT c.name, COUNT(s.id) as count
            FROM sources s
            JOIN categories c ON s.category_id = c.id
            GROUP BY c.name
            ORDER BY count DESC
        ''')
        print("\n  Fuentes por categoria:")
        for row in self.cursor.fetchall():
            print(f"    {row['name']}: {row['count']}")
        
        # Promedio de calificaciones
        self.cursor.execute("SELECT AVG(overall_rating) as avg FROM sources WHERE overall_rating > 0")
        avg_rating = self.cursor.fetchone()['avg']
        print(f"\n  Calificacion promedio: {avg_rating:.2f}/5.0")
        
        print("\n✅ Base de datos poblada exitosamente!")
        print(f"📁 Archivo: {self.db_path}")

def main():
    """Funcion principal"""
    import sys
    
    print("="*60)
    print("ARTICORA - POBLADOR DE BASE DE DATOS")
    print("="*60)
    
    # Configurar ruta de la base de datos
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        db_path = "articora-data.db"
    
    # Crear instancia del poblador
    populator = ArticoraDataPopulator(db_path)
    
    # Poblar la base de datos
    try:
        populator.populate_all()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operacion cancelada por el usuario")
        if populator.conn:
            populator.conn.close()
    except Exception as e:
        print(f"\n❌ Error durante la poblacion: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
