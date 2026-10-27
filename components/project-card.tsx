import Link from 'next/link'
import { CoverArt } from './cover-art'
import type { Project } from '@/lib/types'

export function ProjectCard({ project, href, showTenant }: { project: Project; href: string; showTenant?: string }) {
  return (
    <Link href={href} className="card">
      <div className="card-cover">
        <CoverArt
          seed={project.id}
          accent={project.accent}
          glyph={project.glyph}
          label={project.category}
          image={project.cover}
          name={project.name}
        />
      </div>
      <div className="card-body">
        <div className="card-title">
          <span>{project.name}</span>
          <span className="arrow">→</span>
        </div>
        {project.nameEn && project.nameEn !== project.name ? (
          <div className="card-name-en">{project.nameEn}</div>
        ) : null}
        <p className="card-tagline">{project.tagline}</p>
        <div className="card-foot">
          {project.stack.slice(0, 3).map((s) => (
            <span className="pill" key={s}>
              {s}
            </span>
          ))}
          {showTenant ? <span className="pill accent">{showTenant}</span> : null}
        </div>
      </div>
    </Link>
  )
}
