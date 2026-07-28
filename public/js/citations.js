// Shared citation formatter for frontend exports
(function () {
    function cleanText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function escapeBibtex(value) {
        return cleanText(value)
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\$/g, '\\$');
    }

    function formatAuthors(authors) {
        const list = Array.isArray(authors) ? authors.map(cleanText).filter(Boolean) : [];
        return list.join(', ');
    }

    function formatVenue(source) {
        return cleanText(source.journal || source.publisher || source.journal_publisher || source.venue || '');
    }

    function formatUrl(source) {
        const url = cleanText(source.url || source.primaryUrl || source.primary_url || '');
        return url ? url : '';
    }

    function getBibtexEntryType(source) {
        const type = cleanText(source.type).toLowerCase();
        if (type.includes('book') || type.includes('libro')) return 'book';
        if (type.includes('thesis') || type.includes('tesis')) return 'mastersthesis';
        if (type.includes('conference') || type.includes('conferencia')) return 'inproceedings';
        return 'article';
    }

    function buildCitationFormats(source) {
        const title = cleanText(source.title);
        const authors = formatAuthors(source.authors);
        const year = cleanText(source.year) || 's. f.';
        const venue = formatVenue(source);
        const url = formatUrl(source);
        const doi = cleanText(source.doi);
        const authorSegment = authors || source.uploader || 'Autor desconocido';

        const commonSuffix = [venue ? `${venue}.` : '', url ? url : '', doi ? `https://doi.org/${doi}` : '']
            .filter(Boolean)
            .join(' ')
            .trim();

        const apa = `${authorSegment} (${year}). ${title}.${commonSuffix ? ` ${commonSuffix}` : ''}`.trim();
        const chicago = `${authorSegment}. ${title}.${venue ? ` ${venue}.` : ''} ${year}.${url ? ` ${url}` : ''}`.trim();
        const harvard = `${authorSegment} (${year}) ${title}.${venue ? ` ${venue}.` : ''}${url ? ` Available at: ${url}` : ''}`.trim();
        const mla = `${authorSegment}. ${title}.${venue ? ` ${venue},` : ''} ${year}.${url ? ` ${url}` : ''}`.trim();
        const ieee = `${authorSegment}, "${title},"${venue ? ` ${venue},` : ''} ${year}.${url ? ` [Online]. Available: ${url}` : ''}`.trim();
        const vancouver = `${authorSegment}. ${title}.${venue ? ` ${venue}.` : ''} ${year}.${url ? ` Available from: ${url}` : ''}`.trim();

        const entryType = getBibtexEntryType(source);
        const bibtexFields = [
            `title={${escapeBibtex(title)}}`,
            authors ? `author={${escapeBibtex(authors)}}` : '',
            `year={${escapeBibtex(year)}}`,
            venue && entryType === 'book' ? `publisher={${escapeBibtex(venue)}}` : '',
            venue && entryType !== 'book' ? `journal={${escapeBibtex(venue)}}` : '',
            doi ? `doi={${escapeBibtex(doi)}}` : '',
            url ? `url={${escapeBibtex(url)}}` : ''
        ].filter(Boolean).join(', ');
        const bibtex = `@${entryType}{source${source.id || 'x'}, ${bibtexFields} }`;

        return { apa, chicago, harvard, mla, ieee, vancouver, bibtex };
    }

    function parseCitationSourceFromElement(el) {
        if (!el) return null;
        const text = el.textContent || el.innerText || '';
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }

    window.ArticoraCitations = {
        buildCitationFormats,
        parseCitationSourceFromElement,
        cleanText
    };
})();