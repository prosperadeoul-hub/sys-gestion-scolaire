import MySQLdb

conn = MySQLdb.connect(host='localhost', user='root', passwd='', db='gestion_scolaire_db')
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE core_professeur DROP COLUMN grade;")
    print("[OK] Colonne 'grade' supprimee avec succes")
except MySQLdb.OperationalError as e:
    if e.args[0] == 1091:  # Unknown column
        print("[INFO] La colonne 'grade' n'existait pas")
    else:
        raise
finally:
    conn.commit()
    cur.close()
    conn.close()
