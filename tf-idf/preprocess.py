import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer

stemmer = SnowballStemmer('spanish')
stop_words = set(stopwords.words('spanish'))

def preprocess(text: str) -> list[str]:
    # minúsculas
    text = text.lower()
    # solo letras (incluye acentos y ñ)
    text = re.sub(r'[^a-záéíóúüñ]', ' ', text)
    # tokenizar
    tokens = text.split()
    # filtrar palabras cortas y stopwords
    tokens = [t for t in tokens if len(t) > 2 and t not in stop_words]
    # stemming
    tokens = [stemmer.stem(t) for t in tokens]
    return tokens